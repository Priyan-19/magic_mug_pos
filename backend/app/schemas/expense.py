from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class ExpenseBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=50, examples=["Milk & Dairy"])
    description: str = Field(..., min_length=1, max_length=500, examples=["Full cream milk 10L"])
    amount: Decimal = Field(..., gt=Decimal("0.00"), examples=[Decimal("650.00")])
    payment_mode: str = Field("CASH", pattern="^(CASH|UPI|CARD|BANK_TRANSFER)$")
    expense_date: date = Field(default_factory=date.today)


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    payment_mode: Optional[str] = Field(None, pattern="^(CASH|UPI|CARD|BANK_TRANSFER)$")
    expense_date: Optional[date] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at", when_used="always")
    def serialize_dt(self, v: Optional[datetime], _info):
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class ExpenseListResponse(BaseModel):
    items: List[ExpenseResponse]
    total_amount: Decimal = Decimal("0.00")
    count: int = 0
