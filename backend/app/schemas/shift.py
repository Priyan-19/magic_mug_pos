from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class ShiftOpenRequest(BaseModel):
    opening_cash: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), examples=[1000.00])
    opening_notes: Optional[str] = Field(None, max_length=500, examples=["Morning float change"])


class ShiftCloseRequest(BaseModel):
    closing_cash_actual: Decimal = Field(..., ge=Decimal("0.00"), examples=[4500.00])
    closing_notes: Optional[str] = Field(None, max_length=500, examples=["Evening handover to admin"])


class ShiftCashflowSummary(BaseModel):
    shift_id: int
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opened_by_id: int
    opened_by_name: str
    opening_cash: Decimal
    cash_sales: Decimal = Decimal("0.00")
    upi_sales: Decimal = Decimal("0.00")
    card_sales: Decimal = Decimal("0.00")
    total_sales: Decimal = Decimal("0.00")
    cash_expenses: Decimal = Decimal("0.00")
    expected_cash: Decimal = Decimal("0.00")
    closing_cash_actual: Optional[Decimal] = None
    closing_difference: Optional[Decimal] = None
    closing_notes: Optional[str] = None
    confirmed_bills_count: int = 0
    void_bills_count: int = 0

    @field_serializer("opened_at", "closed_at", when_used="always")
    def serialize_dt(self, v: Optional[datetime], _info):
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class ShiftResponse(BaseModel):
    id: int
    user_id: int
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_cash: Decimal
    opening_notes: Optional[str] = None
    closing_cash_actual: Optional[Decimal] = None
    closing_cash_expected: Optional[Decimal] = None
    closing_difference: Optional[Decimal] = None
    closing_notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("opened_at", "closed_at", "created_at", when_used="always")
    def serialize_dt(self, v: Optional[datetime], _info):
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
