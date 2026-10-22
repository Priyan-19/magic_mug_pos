from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal
from typing import List, Optional
import calendar
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.bill import Bill, BillItem
from app.models.product import Product
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.analytics import (
    DailyAnalyticsResponse,
    WeeklyAnalyticsResponse,
    MonthlyAnalyticsResponse,
    BestSellerItem,
    SlowMoverItem,
    TopProductItem,
    HourlySalesPoint,
    PaymentBreakdown,
    DaySalesPoint,
    CategoryPerformance
)


def get_tz() -> ZoneInfo:
    return ZoneInfo(settings.TIMEZONE)


def get_date_bounds_utc(target_date: date):
    tz = get_tz()
    local_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=tz)
    local_end = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=tz)
    return local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)


def get_range_bounds_utc(start_date: date, end_date: date):
    tz = get_tz()
    local_start = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=tz)
    local_end = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=tz)
    return local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)


class AnalyticsService:
    @staticmethod
    async def get_daily_analytics(db: AsyncSession, target_date: date) -> DailyAnalyticsResponse:
        start_dt, end_dt = get_date_bounds_utc(target_date)
        tz = get_tz()

        # 1. Fetch daily bills in a single pass for sales, hourly breakdown, and payment distribution
        daily_bills_stmt = (
            select(Bill.bill_date, Bill.total_amount, Bill.payment_mode)
            .where(
                and_(
                    Bill.status == "CONFIRMED",
                    Bill.bill_date >= start_dt,
                    Bill.bill_date <= end_dt
                )
            )
        )
        daily_bills_res = await db.execute(daily_bills_stmt)
        daily_bills = daily_bills_res.all()

        total_sales = Decimal("0.00")
        bill_count = len(daily_bills)
        hours_map = {h: {"sales": Decimal("0.00"), "count": 0} for h in range(0, 24)}
        pay_dict = {"CASH": Decimal("0.00"), "CARD": Decimal("0.00"), "UPI": Decimal("0.00")}

        for b_date, b_total, b_mode in daily_bills:
            amt = Decimal(str(b_total))
            total_sales += amt
            pay_dict[b_mode] = pay_dict.get(b_mode, Decimal("0.00")) + amt
            local_b_date = b_date.astimezone(tz) if b_date.tzinfo else b_date.replace(tzinfo=timezone.utc).astimezone(tz)
            h = local_b_date.hour
            if h in hours_map:
                hours_map[h]["sales"] += amt
                hours_map[h]["count"] += 1

        avg_bill_value = (total_sales / bill_count) if bill_count > 0 else Decimal("0.00")

        # 2. Total expenses
        exp_stmt = (
            select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
            .where(Expense.expense_date == target_date)
        )
        exp_res = await db.execute(exp_stmt)
        total_expense = exp_res.scalar() or Decimal("0.00")
        net_revenue = total_sales - total_expense

        # 3. Top products for the day
        top_stmt = (
            select(
                BillItem.product_id,
                BillItem.product_name_snapshot,
                func.sum(BillItem.quantity).label("total_qty"),
                func.sum(BillItem.line_total).label("total_rev")
            )
            .join(Bill, Bill.id == BillItem.bill_id)
            .where(
                and_(
                    Bill.status == "CONFIRMED",
                    Bill.bill_date >= start_dt,
                    Bill.bill_date <= end_dt
                )
            )
            .group_by(BillItem.product_id, BillItem.product_name_snapshot)
            .order_by(desc("total_qty"))
            .limit(5)
        )
        top_res = await db.execute(top_stmt)
        top_products = [
            TopProductItem(
                product_id=row[0],
                product_name=row[1],
                total_qty=int(row[2]),
                total_revenue=Decimal(str(row[3]))
            )
            for row in top_res.all()
        ]

        hourly_breakdown = [
            HourlySalesPoint(
                hour=h,
                hour_label=f"{h:02d}:00",
                total_sales=data["sales"],
                bill_count=data["count"]
            )
            for h, data in sorted(hours_map.items())
        ]

        payment_breakdown = PaymentBreakdown(
            cash=pay_dict.get("CASH", Decimal("0.00")),
            card=pay_dict.get("CARD", Decimal("0.00")),
            upi=pay_dict.get("UPI", Decimal("0.00"))
        )

        return DailyAnalyticsResponse(
            target_date=target_date,
            total_sales=Decimal(str(total_sales)),
            bill_count=bill_count,
            avg_bill_value=Decimal(str(avg_bill_value)),
            total_expense=Decimal(str(total_expense)),
            net_revenue=Decimal(str(net_revenue)),
            top_products=top_products,
            hourly_breakdown=hourly_breakdown,
            payment_breakdown=payment_breakdown
        )

    @staticmethod
    async def get_weekly_analytics(db: AsyncSession, start_date: date) -> WeeklyAnalyticsResponse:
        end_date = start_date + timedelta(days=6)
        start_dt, end_dt = get_range_bounds_utc(start_date, end_date)

        daily_points: List[DaySalesPoint] = []
        week_total_sales = Decimal("0.00")
        week_total_bills = 0
        week_total_expenses = Decimal("0.00")

        # Iterate 7 days
        for i in range(7):
            current_day = start_date + timedelta(days=i)
            c_start, c_end = get_date_bounds_utc(current_day)

            # Sales for day
            s_stmt = (
                select(
                    func.coalesce(func.sum(Bill.total_amount), Decimal("0.00")),
                    func.count(Bill.id)
                )
                .where(
                    and_(
                        Bill.status == "CONFIRMED",
                        Bill.bill_date >= c_start,
                        Bill.bill_date <= c_end
                    )
                )
            )
            s_res = await db.execute(s_stmt)
            d_sales, d_count = s_res.first() or (Decimal("0.00"), 0)

            # Expenses for day
            e_stmt = (
                select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
                .where(Expense.expense_date == current_day)
            )
            e_res = await db.execute(e_stmt)
            d_expense = e_res.scalar() or Decimal("0.00")
            d_net = d_sales - d_expense

            week_total_sales += d_sales
            week_total_bills += d_count
            week_total_expenses += d_expense

            daily_points.append(
                DaySalesPoint(
                    date=current_day,
                    day_name=current_day.strftime("%a"),
                    total_sales=Decimal(str(d_sales)),
                    bill_count=d_count,
                    expenses=Decimal(str(d_expense)),
                    net_revenue=Decimal(str(d_net))
                )
            )

        # Category performance
        cat_stmt = (
            select(
                Category.id,
                Category.name,
                func.sum(BillItem.quantity).label("total_qty"),
                func.sum(BillItem.line_total).label("total_rev")
            )
            .join(Product, Product.id == BillItem.product_id)
            .join(Category, Category.id == Product.category_id)
            .join(Bill, Bill.id == BillItem.bill_id)
            .where(
                and_(
                    Bill.status == "CONFIRMED",
                    Bill.bill_date >= start_dt,
                    Bill.bill_date <= end_dt
                )
            )
            .group_by(Category.id, Category.name)
            .order_by(desc("total_rev"))
        )
        cat_res = await db.execute(cat_stmt)
        cat_performance = [
            CategoryPerformance(
                category_id=row[0],
                category_name=row[1],
                total_qty=int(row[2]),
                total_revenue=Decimal(str(row[3]))
            )
            for row in cat_res.all()
        ]

        return WeeklyAnalyticsResponse(
            start_date=start_date,
            end_date=end_date,
            total_sales=Decimal(str(week_total_sales)),
            bill_count=week_total_bills,
            total_expense=Decimal(str(week_total_expenses)),
            net_revenue=Decimal(str(week_total_sales - week_total_expenses)),
            daily_breakdown=daily_points,
            category_performance=cat_performance
        )

    @staticmethod
    async def get_monthly_analytics(db: AsyncSession, year: int, month: int) -> MonthlyAnalyticsResponse:
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        start_dt, end_dt = get_range_bounds_utc(start_date, end_date)

        daily_points: List[DaySalesPoint] = []
        month_total_sales = Decimal("0.00")
        month_total_bills = 0
        month_total_expenses = Decimal("0.00")

        for d in range(1, last_day + 1):
            cur_date = date(year, month, d)
            c_start, c_end = get_date_bounds_utc(cur_date)

            s_stmt = (
                select(
                    func.coalesce(func.sum(Bill.total_amount), Decimal("0.00")),
                    func.count(Bill.id)
                )
                .where(
                    and_(
                        Bill.status == "CONFIRMED",
                        Bill.bill_date >= c_start,
                        Bill.bill_date <= c_end
                    )
                )
            )
            s_res = await db.execute(s_stmt)
            d_sales, d_count = s_res.first() or (Decimal("0.00"), 0)

            e_stmt = (
                select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))
                .where(Expense.expense_date == cur_date)
            )
            e_res = await db.execute(e_stmt)
            d_expense = e_res.scalar() or Decimal("0.00")

            month_total_sales += d_sales
            month_total_bills += d_count
            month_total_expenses += d_expense

            daily_points.append(
                DaySalesPoint(
                    date=cur_date,
                    day_name=cur_date.strftime("%d %b"),
                    total_sales=Decimal(str(d_sales)),
                    bill_count=d_count,
                    expenses=Decimal(str(d_expense)),
                    net_revenue=Decimal(str(d_sales - d_expense))
                )
            )

        # Top products for month
        top_stmt = (
            select(
                BillItem.product_id,
                BillItem.product_name_snapshot,
                func.sum(BillItem.quantity).label("total_qty"),
                func.sum(BillItem.line_total).label("total_rev")
            )
            .join(Bill, Bill.id == BillItem.bill_id)
            .where(
                and_(
                    Bill.status == "CONFIRMED",
                    Bill.bill_date >= start_dt,
                    Bill.bill_date <= end_dt
                )
            )
            .group_by(BillItem.product_id, BillItem.product_name_snapshot)
            .order_by(desc("total_qty"))
            .limit(10)
        )
        top_res = await db.execute(top_stmt)
        top_products = [
            TopProductItem(
                product_id=row[0],
                product_name=row[1],
                total_qty=int(row[2]),
                total_revenue=Decimal(str(row[3]))
            )
            for row in top_res.all()
        ]

        return MonthlyAnalyticsResponse(
            year=year,
            month=month,
            total_sales=Decimal(str(month_total_sales)),
            bill_count=month_total_bills,
            total_expense=Decimal(str(month_total_expenses)),
            net_revenue=Decimal(str(month_total_sales - month_total_expenses)),
            daily_breakdown=daily_points,
            top_products=top_products
        )

    @staticmethod
    async def get_best_sellers(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 10
    ) -> List[BestSellerItem]:
        filters = [Bill.status == "CONFIRMED"]
        if start_date:
            s_dt, _ = get_date_bounds_utc(start_date)
            filters.append(Bill.bill_date >= s_dt)
        if end_date:
            _, e_dt = get_date_bounds_utc(end_date)
            filters.append(Bill.bill_date <= e_dt)

        stmt = (
            select(
                BillItem.product_id,
                BillItem.product_name_snapshot,
                Category.name.label("category_name"),
                func.sum(BillItem.quantity).label("total_qty"),
                func.sum(BillItem.line_total).label("total_revenue"),
                func.count(func.distinct(Bill.id)).label("orders_count")
            )
            .join(Bill, Bill.id == BillItem.bill_id)
            .outerjoin(Product, Product.id == BillItem.product_id)
            .outerjoin(Category, Category.id == Product.category_id)
            .where(and_(*filters))
            .group_by(BillItem.product_id, BillItem.product_name_snapshot, Category.name)
            .order_by(desc("total_qty"), desc("total_revenue"))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return [
            BestSellerItem(
                product_id=row[0],
                product_name=row[1],
                category_name=row[2] or "General",
                total_qty=int(row[3]),
                total_revenue=Decimal(str(row[4])),
                orders_count=int(row[5])
            )
            for row in result.all()
        ]

    @staticmethod
    async def get_slow_movers(
        db: AsyncSession,
        days: int = 30,
        limit: int = 10
    ) -> List[SlowMoverItem]:
        since_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Get all active products
        active_prod_stmt = (
            select(Product.id, Product.name, Product.selling_price, Category.name)
            .outerjoin(Category, Category.id == Product.category_id)
            .where(Product.is_active == True)
        )
        prod_res = await db.execute(active_prod_stmt)
        all_active = prod_res.all()

        # Query sales in the window
        sales_stmt = (
            select(
                BillItem.product_id,
                func.sum(BillItem.quantity).label("sold_qty"),
                func.sum(BillItem.line_total).label("rev")
            )
            .join(Bill, Bill.id == BillItem.bill_id)
            .where(
                and_(
                    Bill.status == "CONFIRMED",
                    Bill.bill_date >= since_date
                )
            )
            .group_by(BillItem.product_id)
        )
        sales_res = await db.execute(sales_stmt)
        sales_map = {row[0]: (int(row[1]), Decimal(str(row[2]))) for row in sales_res.all()}

        items = []
        for p_id, p_name, p_price, cat_name in all_active:
            qty, rev = sales_map.get(p_id, (0, Decimal("0.00")))
            items.append(
                SlowMoverItem(
                    product_id=p_id,
                    product_name=p_name,
                    category_name=cat_name or "General",
                    selling_price=Decimal(str(p_price)),
                    total_qty=qty,
                    total_revenue=rev,
                    days_window=days
                )
            )

        # Sort ascending by quantity sold
        items.sort(key=lambda x: (x.total_qty, x.total_revenue))
        return items[:limit]
