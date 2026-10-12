from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    category_id: int = Field(..., gt=0, examples=[1])
    name: str = Field(..., min_length=1, max_length=100, examples=["Classic Cappuccino"])
    description: Optional[str] = Field(None, examples=["Double shot espresso with steamed velvety milk foam"])
    selling_price: Decimal = Field(..., ge=Decimal("0.00"), examples=[Decimal("45.00")])
    image_url: Optional[str] = Field(None, examples=["https://images.unsplash.com/..."])
    is_active: bool = True
    track_stock: bool = False
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    selling_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    track_stock: Optional[bool] = None
    stock_quantity: Optional[int] = None


class ProductResponse(ProductBase):
    id: int
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
