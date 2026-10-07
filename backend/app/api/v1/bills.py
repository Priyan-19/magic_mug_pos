from typing import Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.bill import Bill
from app.models.user import User
from app.schemas.bill import (
    BillCreate,
    BillResponse,
    BillListResponse,
    BillVoidRequest,
    BillSummaryStats
)
from app.services.billing_service import BillingService
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/bills", tags=["Billing"])


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Execute authoritative transaction
    bill = await BillingService.create_bill(db=db, user_id=current_user.id, payload=payload)
    await db.commit()
    await db.refresh(bill)

    resp = BillResponse.model_validate(bill)
    resp.creator_name = current_user.full_name
    return resp


@router.get("", response_model=BillListResponse)
async def list_bills(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by bill number"),
    status: Optional[str] = Query(None, description="Filter by status (CONFIRMED/VOID)"),
    payment_mode: Optional[str] = Query(None, description="Filter by payment mode (CASH/CARD/UPI)"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bills, total, confirmed_rev, confirmed_cnt, void_cnt = await BillingService.get_bills_paginated(
        db=db,
        page=page,
        limit=limit,
        search=search,
        status_filter=status,
        payment_mode=payment_mode,
        start_date=start_date,
        end_date=end_date
    )

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    # Fetch creator names in bulk if needed
    creator_ids = {b.created_by for b in bills}
    creator_map = {}
    if creator_ids:
        u_stmt = select(User).where(User.id.in_(creator_ids))
        u_res = await db.execute(u_stmt)
        creator_map = {u.id: u.full_name for u in u_res.scalars().all()}

    items = []
    for b in bills:
        item_resp = BillResponse.model_validate(b)
        item_resp.creator_name = creator_map.get(b.created_by, "Unknown")
        items.append(item_resp)

    return BillListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        summary=BillSummaryStats(
            total_confirmed_revenue=Decimal(str(confirmed_rev)),
            confirmed_count=confirmed_cnt,
            void_count=void_cnt
        )
    )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill_detail(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bill = await BillingService.get_bill_by_id(db, bill_id)
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID {bill_id} not found"
        )
    
    creator = await db.get(User, bill.created_by)
    resp = BillResponse.model_validate(bill)
    resp.creator_name = creator.full_name if creator else "Unknown"
    return resp


@router.post("/{bill_id}/void", response_model=BillResponse)
async def void_bill(
    bill_id: int,
    payload: BillVoidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    bill = await BillingService.void_bill(
        db=db,
        bill_id=bill_id,
        user_id=current_user.id,
        payload=payload
    )
    await db.commit()
    await db.refresh(bill)

    creator = await db.get(User, bill.created_by)
    resp = BillResponse.model_validate(bill)
    resp.creator_name = creator.full_name if creator else "Unknown"
    return resp
