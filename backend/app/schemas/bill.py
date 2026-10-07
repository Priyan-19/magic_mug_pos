from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class BillItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, examples=[1])


class BillCreate(BaseModel):
    payment_mode: str = Field("CASH", pattern="^(CASH|CARD|UPI)$")
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    items: List[BillItemCreate] = Field(..., min_length=1)


class BillItemResponse(BaseModel):
    id: int
    product_id: int
    product_name_snapshot: str
    unit_price_snapshot: Decimal
    quantity: int
    line_total: Decimal
    model_config = ConfigDict(from_attributes=True)


class BillResponse(BaseModel):
    id: int
    bill_number: str
    bill_date: datetime
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_mode: str
    status: str
    void_reason: Optional[str] = None
    voided_at: Optional[datetime] = None
    created_by: int
    creator_name: Optional[str] = None
    items: List[BillItemResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("bill_date", "created_at", "voided_at", when_used="always")
    def serialize_dt(self, v: Optional[datetime], _info):
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class BillVoidRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500, examples=["Customer changed order"])


class BillSummaryStats(BaseModel):
    total_confirmed_revenue: Decimal = Decimal("0.00")
    confirmed_count: int = 0
    void_count: int = 0


class BillListResponse(BaseModel):
    items: List[BillResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    summary: BillSummaryStats
