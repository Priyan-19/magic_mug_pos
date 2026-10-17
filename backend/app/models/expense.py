from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import Column, Integer, BigInteger, String, Text, Numeric, Date, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(10, 2, asdecimal=True), nullable=False)
    payment_mode = Column(String(20), default="CASH", nullable=False)
    expense_date = Column(Date, default=date.today, nullable=False, index=True)
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
    creator = relationship("User", back_populates="expenses")
    shift = relationship("Shift")

    __table_args__ = (
        Index("idx_expenses_date", "expense_date"),
        CheckConstraint("amount > 0", name="check_expense_amount_positive"),
        CheckConstraint("payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER')", name="check_expense_payment_mode"),
    )
