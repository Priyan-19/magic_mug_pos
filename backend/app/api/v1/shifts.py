from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.shift import Shift
from app.models.bill import Bill
from app.models.expense import Expense
from app.models.user import User
from app.schemas.shift import (
    ShiftOpenRequest,
    ShiftCloseRequest,
    ShiftCashflowSummary,
    ShiftResponse
)
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/shifts", tags=["Shifts & Cashflow"])


async def compute_shift_cashflow(db: AsyncSession, shift: Shift) -> ShiftCashflowSummary:
    """Computes exact live sales cashflow, drawer balance, and breakdown for a given shift."""
    end_time = shift.closed_at if shift.status == "CLOSED" else datetime.now(timezone.utc)

    # 1. Fetch Confirmed Bills
    bills_stmt = (
        select(Bill)
        .where(
            and_(
                Bill.status == "CONFIRMED",
                or_(
                    Bill.shift_id == shift.id,
                    and_(Bill.bill_date >= shift.opened_at, Bill.bill_date <= end_time)
                )
            )
        )
    )
    bills_res = await db.execute(bills_stmt)
    bills = bills_res.scalars().all()

    # 2. Fetch Void Bills count
    void_stmt = (
        select(func.count(Bill.id))
        .where(
            and_(
                Bill.status == "VOID",
                or_(
                    Bill.shift_id == shift.id,
                    and_(Bill.bill_date >= shift.opened_at, Bill.bill_date <= end_time)
                )
            )
        )
    )
    void_count = (await db.execute(void_stmt)).scalar() or 0

    cash_sales = Decimal("0.00")
    cash_received_gross = Decimal("0.00")
    change_given_total = Decimal("0.00")
    upi_sales = Decimal("0.00")
    card_sales = Decimal("0.00")

    for b in bills:
        amt = Decimal(str(b.total_amount))
        if b.payment_mode == "CASH":
            cash_sales += amt
            tender = Decimal(str(b.cash_tendered)) if b.cash_tendered is not None else amt
            change = Decimal(str(b.change_given)) if b.change_given is not None else Decimal("0.00")
            cash_received_gross += tender
            change_given_total += change
        elif b.payment_mode == "UPI":
            upi_sales += amt
        elif b.payment_mode == "CARD":
            card_sales += amt
        elif b.payment_mode == "SPLIT" and b.split_details:
            cash_part = Decimal(str(b.split_details.get("CASH") or b.split_details.get("cash") or 0))
            upi_part = Decimal(str(b.split_details.get("UPI") or b.split_details.get("upi") or 0))
            card_part = Decimal(str(b.split_details.get("CARD") or b.split_details.get("card") or 0))
            cash_sales += cash_part
            upi_sales += upi_part
            card_sales += card_part
            tender = Decimal(str(b.cash_tendered)) if b.cash_tendered is not None else cash_part
            change = Decimal(str(b.change_given)) if b.change_given is not None else Decimal("0.00")
            cash_received_gross += tender
            change_given_total += change
        else:
            cash_sales += amt
            cash_received_gross += amt

    total_sales = cash_sales + upi_sales + card_sales

    # 3. Fetch Cash Expenses (only cash expenses reduce the physical drawer)
    exp_stmt = (
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            and_(
                Expense.payment_mode == "CASH",
                or_(
                    Expense.shift_id == shift.id,
                    and_(Expense.created_at >= shift.opened_at, Expense.created_at <= end_time)
                )
            )
        )
    )
    cash_expenses = Decimal(str((await db.execute(exp_stmt)).scalar() or "0.00"))

    # Expected Cash = Opening Float + Cash In (Sales) - Cash Out (Expenses)
    expected_cash = Decimal(str(shift.opening_cash)) + cash_sales - cash_expenses

    # Closing Difference (if closed)
    closing_diff = None
    if shift.status == "CLOSED" and shift.closing_cash_actual is not None:
        closing_diff = Decimal(str(shift.closing_cash_actual)) - expected_cash

    # Fetch opener user name
    user_stmt = select(User.full_name).where(User.id == shift.user_id)
    opened_by_name = (await db.execute(user_stmt)).scalar() or f"User #{shift.user_id}"

    return ShiftCashflowSummary(
        shift_id=shift.id,
        status=shift.status,
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        opened_by_id=shift.user_id,
        opened_by_name=opened_by_name,
        opening_cash=Decimal(str(shift.opening_cash)),
        cash_sales=cash_sales,
        cash_received_gross=cash_received_gross,
        change_given_total=change_given_total,
        upi_sales=upi_sales,
        card_sales=card_sales,
        total_sales=total_sales,
        cash_expenses=cash_expenses,
        expected_cash=expected_cash,
        closing_cash_actual=shift.closing_cash_actual,
        closing_difference=closing_diff,
        closing_notes=shift.closing_notes,
        confirmed_bills_count=len(bills),
        void_bills_count=void_count
    )


@router.get("/current", response_model=Optional[ShiftCashflowSummary])
async def get_current_shift(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the currently active open register shift with live sales cashflow metrics."""
    stmt = select(Shift).where(Shift.status == "OPEN").order_by(Shift.id.desc())
    active_shift = (await db.execute(stmt)).scalars().first()

    if not active_shift:
        return None

    return await compute_shift_cashflow(db, active_shift)


@router.post("/open", response_model=ShiftCashflowSummary, status_code=status.HTTP_201_CREATED)
async def open_shift(
    payload: ShiftOpenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Opens a new day register shift with specified opening cash float."""
    # Check if a shift is already open
    existing_stmt = select(Shift).where(Shift.status == "OPEN")
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift #{existing.id} is already open. Please close it before starting a new one."
        )

    shift = Shift(
        user_id=current_user.id,
        status="OPEN",
        opened_at=datetime.now(timezone.utc),
        opening_cash=payload.opening_cash,
        opening_notes=payload.opening_notes
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)

    return await compute_shift_cashflow(db, shift)


@router.post("/close", response_model=ShiftCashflowSummary)
async def close_shift(
    payload: ShiftCloseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER", "CASHIER"]))
):
    """Closes the active shift, compares counted cash to expected cash, and generates EOD summary."""
    stmt = select(Shift).where(Shift.status == "OPEN").order_by(Shift.id.desc())
    active_shift = (await db.execute(stmt)).scalars().first()
    if not active_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active shift is currently open to close."
        )

    now = datetime.now(timezone.utc)
    active_shift.closed_at = now

    # Compute expected cash up to this closing moment
    summary = await compute_shift_cashflow(db, active_shift)

    active_shift.status = "CLOSED"
    active_shift.closing_cash_actual = payload.closing_cash_actual
    active_shift.closing_cash_expected = summary.expected_cash
    active_shift.closing_difference = payload.closing_cash_actual - summary.expected_cash
    active_shift.closing_notes = payload.closing_notes

    await db.commit()
    await db.refresh(active_shift)

    return await compute_shift_cashflow(db, active_shift)


@router.get("/history", response_model=List[ShiftCashflowSummary])
async def list_shift_history(
    limit: int = 15,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent closed shift records and EOD reconciliations."""
    stmt = select(Shift).where(Shift.status == "CLOSED").order_by(desc(Shift.closed_at)).limit(limit)
    shifts = (await db.execute(stmt)).scalars().all()

    results = []
    for s in shifts:
        results.append(await compute_shift_cashflow(db, s))
    return results
