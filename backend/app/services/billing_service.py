from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.bill import Bill, BillItem
from app.models.product import Product
from app.models.user import User
from app.schemas.bill import BillCreate, BillVoidRequest


from zoneinfo import ZoneInfo
from app.core.config import settings

class BillingService:
    @staticmethod
    async def generate_bill_number(db: AsyncSession, bill_date: datetime) -> str:
        tz = ZoneInfo(settings.TIMEZONE)
        local_date = bill_date.astimezone(tz) if bill_date.tzinfo else bill_date.replace(tzinfo=timezone.utc).astimezone(tz)
        date_str = local_date.strftime("%Y%m%d")
        prefix = f"MUG-{date_str}-"
        
        # Find count of bills generated on this calendar day prefix
        stmt = (
            select(func.count(Bill.id))
            .where(Bill.bill_number.like(f"{prefix}%"))
        )
        result = await db.execute(stmt)
        count = result.scalar() or 0
        sequence_num = count + 1
        return f"{prefix}{sequence_num:04d}"

    @staticmethod
    async def create_bill(
        db: AsyncSession,
        user_id: int,
        payload: BillCreate
    ) -> Bill:
        now = datetime.now(timezone.utc)
        subtotal = Decimal("0.00")
        bill_items: List[BillItem] = []

        # Validate products and compute authoritative totals
        for item_in in payload.items:
            product = await db.get(Product, item_in.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with ID {item_in.product_id} does not exist"
                )
            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{product.name}' (ID {product.id}) is deactivated and cannot be billed"
                )
            
            # Stock tracking check & balance deduction
            if product.track_stock:
                if product.stock_quantity < item_in.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for '{product.name}'. Remaining balance: {product.stock_quantity}, requested: {item_in.quantity}"
                    )
                product.stock_quantity -= item_in.quantity
            
            unit_price = Decimal(str(product.selling_price))
            line_total = unit_price * item_in.quantity
            subtotal += line_total

            bill_items.append(
                BillItem(
                    product_id=product.id,
                    product_name_snapshot=product.name,
                    unit_price_snapshot=unit_price,
                    quantity=item_in.quantity,
                    line_total=line_total
                )
            )

        discount = Decimal(str(payload.discount_amount or "0.00"))
        tax = Decimal(str(payload.tax_amount or "0.00"))
        
        if discount > subtotal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount amount ({discount}) cannot exceed subtotal ({subtotal})"
            )
        
        total = subtotal - discount + tax
        bill_number = await BillingService.generate_bill_number(db, now)

        # Check if an active shift is open to associate the bill
        from app.models.shift import Shift
        shift_stmt = select(Shift.id).where(Shift.status == "OPEN").order_by(Shift.id.desc())
        active_shift_id = (await db.execute(shift_stmt)).scalars().first()

        bill = Bill(
            bill_number=bill_number,
            bill_date=now,
            subtotal=subtotal,
            discount_amount=discount,
            tax_amount=tax,
            total_amount=total,
            payment_mode=payload.payment_mode,
            split_details=payload.split_details,
            shift_id=active_shift_id,
            status="CONFIRMED",
            created_by=user_id,
            items=bill_items
        )
        db.add(bill)
        await db.flush()
        return bill

    @staticmethod
    async def get_bill_by_id(db: AsyncSession, bill_id: int) -> Optional[Bill]:
        stmt = (
            select(Bill)
            .where(Bill.id == bill_id)
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_bills_paginated(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        payment_mode: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[Bill], int, Decimal, int, int]:
        filters = []
        if search:
            filters.append(Bill.bill_number.ilike(f"%{search}%"))
        if status_filter:
            filters.append(Bill.status == status_filter)
        if payment_mode:
            filters.append(Bill.payment_mode == payment_mode)
        if start_date:
            start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            filters.append(Bill.bill_date >= start_dt)
        if end_date:
            end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            filters.append(Bill.bill_date <= end_dt)

        base_filter = and_(*filters) if filters else True

        # Count total
        count_stmt = select(func.count(Bill.id)).where(base_filter)
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Aggregate summary stats
        stat_stmt = (
            select(
                func.coalesce(func.sum(Bill.total_amount), Decimal("0.00")),
                func.count(Bill.id)
            )
            .where(and_(base_filter, Bill.status == "CONFIRMED"))
        )
        stat_res = await db.execute(stat_stmt)
        confirmed_rev, confirmed_cnt = stat_res.first() or (Decimal("0.00"), 0)

        void_stmt = (
            select(func.count(Bill.id))
            .where(and_(base_filter, Bill.status == "VOID"))
        )
        void_res = await db.execute(void_stmt)
        void_cnt = void_res.scalar() or 0

        # Query paginated items
        offset = (page - 1) * limit
        items_stmt = (
            select(Bill)
            .where(base_filter)
            .order_by(desc(Bill.bill_date))
            .offset(offset)
            .limit(limit)
        )
        items_res = await db.execute(items_stmt)
        bills = items_res.scalars().all()

        return list(bills), total, confirmed_rev, confirmed_cnt, void_cnt

    @staticmethod
    async def void_bill(
        db: AsyncSession,
        bill_id: int,
        user_id: int,
        payload: BillVoidRequest
    ) -> Bill:
        bill = await BillingService.get_bill_by_id(db, bill_id)
        if not bill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bill with ID {bill_id} not found"
            )
        
        if bill.status == "VOID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bill is already voided"
            )

        now = datetime.now(timezone.utc)
        bill.status = "VOID"
        bill.void_reason = payload.reason
        bill.voided_at = now

        # Restore stock for tracked products
        for item in bill.items:
            prod = await db.get(Product, item.product_id)
            if prod and prod.track_stock:
                prod.stock_quantity += item.quantity

        await db.flush()
        return bill
