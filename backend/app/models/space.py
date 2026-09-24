from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

AVAILABLE = "available"
UNAVAILABLE = "unavailable"


class StorageSpace(Base):
    __tablename__ = "storage_spaces"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    unique_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    total_capacity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    availability: Mapped[str] = mapped_column(String(20), nullable=False, default=AVAILABLE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner = relationship("User")
    rentals = relationship("RentalRequest", back_populates="space")
