from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, BigInteger, String, Text, Numeric, Boolean, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    category_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    selling_price = Column(Numeric(10, 2, asdecimal=True), nullable=False)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    category = relationship("Category", back_populates="products")
    bill_items = relationship("BillItem", back_populates="product")

    __table_args__ = (
        Index("idx_products_category_active", "category_id", "is_active"),
        CheckConstraint("selling_price >= 0", name="check_product_selling_price_positive"),
    )
