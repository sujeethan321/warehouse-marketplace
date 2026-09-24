from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RentalStatusHistory(Base):
    __tablename__ = "rental_status_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    rental_id: Mapped[int] = mapped_column(ForeignKey("rental_requests.id"), nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rental = relationship("RentalRequest", back_populates="history")
    user = relationship("User")
