from typing import Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse
)
from app.services.auth_service import require_role
from app.services.audit_service import AuditService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category: Optional[str] = Query(None, description="Category filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    filters = []
    if start_date:
        filters.append(Expense.expense_date >= start_date)
    if end_date:
        filters.append(Expense.expense_date <= end_date)
    if category:
        filters.append(Expense.category == category)

    base_filter = and_(*filters) if filters else True

    # Total amount
    total_stmt = select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(base_filter)
    total_res = await db.execute(total_stmt)
    total_amt = total_res.scalar() or Decimal("0.00")

    # Expenses list
    stmt = (
        select(Expense, User.full_name.label("creator_name"))
        .outerjoin(User, User.id == Expense.created_by)
        .where(base_filter)
        .order_by(desc(Expense.expense_date), desc(Expense.created_at))
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for exp, creator_name in rows:
        exp_resp = ExpenseResponse.model_validate(exp)
        exp_resp.creator_name = creator_name
        items.append(exp_resp)

    return ExpenseListResponse(
        items=items,
        total_amount=Decimal(str(total_amt)),
        count=len(items)
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    expense = Expense(
        category=payload.category.strip(),
        description=payload.description.strip(),
        amount=payload.amount,
        expense_date=payload.expense_date,
        created_by=current_user.id
    )
    db.add(expense)
    await db.flush()

    await AuditService.log_action(
        db=db,
        action="EXPENSE_CREATED",
        entity_type="expense",
        entity_id=str(expense.id),
        metadata={
            "category": expense.category,
            "amount": str(expense.amount),
            "date": expense.expense_date.isoformat()
        },
        user_id=current_user.id
    )
    await db.commit()
    await db.refresh(expense)

    resp = ExpenseResponse.model_validate(expense)
    resp.creator_name = current_user.full_name
    return resp


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    expense = await db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found"
        )

    if payload.category is not None:
        expense.category = payload.category.strip()
    if payload.description is not None:
        expense.description = payload.description.strip()
    if payload.amount is not None:
        expense.amount = payload.amount
    if payload.expense_date is not None:
        expense.expense_date = payload.expense_date

    await AuditService.log_action(
        db=db,
        action="EXPENSE_UPDATED",
        entity_type="expense",
        entity_id=str(expense.id),
        metadata={
            "category": expense.category,
            "amount": str(expense.amount),
            "date": expense.expense_date.isoformat()
        },
        user_id=current_user.id
    )
    await db.commit()
    await db.refresh(expense)

    resp = ExpenseResponse.model_validate(expense)
    resp.creator_name = current_user.full_name
    return resp


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    expense = await db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found"
        )

    await AuditService.log_action(
        db=db,
        action="EXPENSE_DELETED",
        entity_type="expense",
        entity_id=str(expense.id),
        metadata={
            "category": expense.category,
            "amount": str(expense.amount),
            "description": expense.description
        },
        user_id=current_user.id
    )

    await db.delete(expense)
    await db.commit()
    return {"success": True, "message": "Expense deleted successfully"}
