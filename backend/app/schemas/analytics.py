from datetime import date
from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel


class TopProductItem(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    total_qty: int
    total_revenue: Decimal


class HourlySalesPoint(BaseModel):
    hour: int
    hour_label: str
    total_sales: Decimal
    bill_count: int


class PaymentBreakdown(BaseModel):
    cash: Decimal = Decimal("0.00")
    card: Decimal = Decimal("0.00")
    upi: Decimal = Decimal("0.00")


class DailyAnalyticsResponse(BaseModel):
    target_date: date
    total_sales: Decimal
    bill_count: int
    avg_bill_value: Decimal
    total_expense: Decimal
    net_revenue: Decimal
    top_products: List[TopProductItem] = []
    hourly_breakdown: List[HourlySalesPoint] = []
    payment_breakdown: PaymentBreakdown = PaymentBreakdown()


class DaySalesPoint(BaseModel):
    date: date
    day_name: str
    total_sales: Decimal
    bill_count: int
    expenses: Decimal
    net_revenue: Decimal


class CategoryPerformance(BaseModel):
    category_id: int
    category_name: str
    total_qty: int
    total_revenue: Decimal


class WeeklyAnalyticsResponse(BaseModel):
    start_date: date
    end_date: date
    total_sales: Decimal
    bill_count: int
    total_expense: Decimal
    net_revenue: Decimal
    daily_breakdown: List[DaySalesPoint] = []
    category_performance: List[CategoryPerformance] = []


class MonthlyAnalyticsResponse(BaseModel):
    year: int
    month: int
    total_sales: Decimal
    bill_count: int
    total_expense: Decimal
    net_revenue: Decimal
    daily_breakdown: List[DaySalesPoint] = []
    top_products: List[TopProductItem] = []


class BestSellerItem(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    category_name: Optional[str] = None
    total_qty: int
    total_revenue: Decimal
    orders_count: int


class SlowMoverItem(BaseModel):
    product_id: int
    product_name: str
    category_name: Optional[str] = None
    selling_price: Decimal
    total_qty: int
    total_revenue: Decimal
    days_window: int
