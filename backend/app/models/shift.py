from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, BigInteger, String, Text, Numeric, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    user_id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    status = Column(String(20), default="OPEN", nullable=False, index=True)  # 'OPEN' or 'CLOSED'
    opened_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    opening_cash = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    opening_notes = Column(Text, nullable=True)
    
    closing_cash_actual = Column(Numeric(12, 2, asdecimal=True), nullable=True)
    closing_cash_expected = Column(Numeric(12, 2, asdecimal=True), nullable=True)
    closing_difference = Column(Numeric(12, 2, asdecimal=True), nullable=True)
    closing_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("idx_shifts_status_opened", "status", "opened_at"),
        CheckConstraint("status IN ('OPEN', 'CLOSED')", name="check_shift_status"),
        CheckConstraint("opening_cash >= 0", name="check_shift_opening_cash_positive"),
    )
