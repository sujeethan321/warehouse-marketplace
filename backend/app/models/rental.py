from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"
CANCELLED = "cancelled"

# Only these statuses consume capacity.
CAPACITY_STATUSES = (APPROVED,)

# Server-side status transition map. Anything not listed is a 400.
ALLOWED_TRANSITIONS = {
    PENDING: {APPROVED, REJECTED, CANCELLED},
    APPROVED: {CANCELLED},
    REJECTED: set(),
    CANCELLED: set(),
}


class RentalRequest(Base):
    __tablename__ = "rental_requests"
    # Every capacity check hits this index.
    # (Run the CREATE INDEX from README if your table doesn't have it yet.)
    __table_args__ = (Index("idx_rental_capacity", "space_id", "start_date", "end_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    space_id: Mapped[int] = mapped_column(ForeignKey("storage_spaces.id"), nullable=False)
    requested_capacity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)  # exclusive: move-out day
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PENDING)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    customer = relationship("User")
    space = relationship("StorageSpace", back_populates="rentals")
    history = relationship(
        "RentalStatusHistory",
        back_populates="rental",
        order_by="RentalStatusHistory.id",
    )
