from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.bill import Bill, BillItem
from app.models.product import Product
from app.models.user import User
from app.schemas.bill import BillCreate, BillVoidRequest
from app.core.cache import catalog_cache, shift_cache


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

        # Collect distinct product IDs and batch-fetch in a single query
        product_ids = list({item_in.product_id for item_in in payload.items})
        stmt = select(Product).where(Product.id.in_(product_ids))
        result = await db.execute(stmt)
        products_map = {p.id: p for p in result.scalars().all()}

        # Validate products and compute authoritative totals
        for item_in in payload.items:
            product = products_map.get(item_in.product_id)
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

        # Compute cash tendered and change given for cash or split transactions
        cash_tendered = None
        change_given = None
        if payload.payment_mode == "CASH":
            if payload.cash_tendered is not None:
                cash_tendered = Decimal(str(payload.cash_tendered))
                if payload.change_given is not None:
                    change_given = Decimal(str(payload.change_given))
                else:
                    change_given = max(Decimal("0.00"), cash_tendered - total)
            else:
                cash_tendered = total
                change_given = Decimal("0.00")
        elif payload.payment_mode == "SPLIT" and payload.split_details:
            split_cash = Decimal(str(payload.split_details.get("CASH") or payload.split_details.get("cash") or "0.00"))
            if payload.cash_tendered is not None:
                cash_tendered = Decimal(str(payload.cash_tendered))
                if payload.change_given is not None:
                    change_given = Decimal(str(payload.change_given))
                else:
                    change_given = max(Decimal("0.00"), cash_tendered - split_cash)
            else:
                cash_tendered = split_cash
                change_given = Decimal("0.00")

        # Check if an active shift is open to associate the bill
        from app.models.shift import Shift
        shift_stmt = select(Shift.id).where(Shift.status == "OPEN").order_by(Shift.id.desc())
        active_shift_id = (await db.execute(shift_stmt)).scalars().first()

        if not active_shift_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daily Register is closed! Please open today's register and enter opening float before billing."
            )

        bill = Bill(
            bill_number=bill_number,
            bill_date=now,
            subtotal=subtotal,
            discount_amount=discount,
            tax_amount=tax,
            total_amount=total,
            payment_mode=payload.payment_mode,
            split_details=payload.split_details,
            cash_tendered=cash_tendered,
            change_given=change_given,
            shift_id=active_shift_id,
            status="CONFIRMED",
            created_by=user_id,
            items=bill_items
        )
        db.add(bill)
        await db.flush()

        # Invalidate shift cashflow and product stock catalog caches
        shift_cache.clear()
        catalog_cache.clear_prefix("products")

        return bill

    @staticmethod
    async def get_bill_by_id(db: AsyncSession, bill_id: int) -> Optional[Bill]:
        stmt = (
            select(Bill)
            .options(joinedload(Bill.creator))
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

        # Optimized Single-Query Summary Aggregation:
        # Replaces 3 sequential round-trips (count total, confirmed sum/count, void count)
        # with 1 single conditional aggregation pass
        summary_stmt = (
            select(
                func.count(Bill.id),
                func.coalesce(
                    func.sum(case((Bill.status == "CONFIRMED", Bill.total_amount), else_=Decimal("0.00"))),
                    Decimal("0.00")
                ),
                func.count(case((Bill.status == "CONFIRMED", 1))),
                func.count(case((Bill.status == "VOID", 1)))
            )
            .where(base_filter)
        )
        summary_res = await db.execute(summary_stmt)
        summary_row = summary_res.first()
        total, confirmed_rev, confirmed_cnt, void_cnt = (
            summary_row if summary_row else (0, Decimal("0.00"), 0, 0)
        )

        # Query paginated items with joinedload(Bill.creator) to eliminate N+1 creator user lookups
        offset = (page - 1) * limit
        items_stmt = (
            select(Bill)
            .options(joinedload(Bill.creator))
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

        # Invalidate shift cashflow and product stock catalog caches
        shift_cache.clear()
        catalog_cache.clear_prefix("products")

        return bill
