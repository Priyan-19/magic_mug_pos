from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, BigInteger, String, Text, Numeric, DateTime, ForeignKey, Index, CheckConstraint, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Bill(Base):
    __tablename__ = "bills"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    bill_number = Column(String(30), unique=True, nullable=False, index=True)
    bill_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    subtotal = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    discount_amount = Column(Numeric(10, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    tax_amount = Column(Numeric(10, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    payment_mode = Column(String(20), default="CASH", nullable=False)
    split_details = Column(JSON, nullable=True)
    status = Column(String(20), default="CONFIRMED", nullable=False, index=True)
    void_reason = Column(Text, nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    shift_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("shifts.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_by = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    creator = relationship("User", back_populates="bills")
    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan", lazy="selectin")
    shift = relationship("Shift")

    __table_args__ = (
        Index("idx_bills_date_status", "bill_date", "status"),
        Index("idx_bills_number", "bill_number"),
        CheckConstraint("payment_mode IN ('CASH', 'CARD', 'UPI', 'SPLIT')", name="check_bill_payment_mode"),
        CheckConstraint("status IN ('CONFIRMED', 'VOID')", name="check_bill_status"),
        CheckConstraint("subtotal >= 0", name="check_bill_subtotal_positive"),
        CheckConstraint("total_amount >= 0", name="check_bill_total_positive"),
    )


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    bill_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    product_name_snapshot = Column(String(100), nullable=False)
    unit_price_snapshot = Column(Numeric(10, 2, asdecimal=True), nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Numeric(12, 2, asdecimal=True), nullable=False)

    # Relationships
    bill = relationship("Bill", back_populates="items")
    product = relationship("Product", back_populates="bill_items")

    __table_args__ = (
        Index("idx_bill_items_product_bill", "product_id", "bill_id"),
        CheckConstraint("quantity > 0", name="check_bill_item_quantity_positive"),
    )
