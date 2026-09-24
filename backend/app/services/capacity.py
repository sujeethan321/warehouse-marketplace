# backend/app/services/capacity.py
from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.space import StorageSpace
from app.models.rental import RentalRequest, RentalStatus

def check_capacity(
    db: Session,
    space_id: int,
    start_date: date,
    end_date: date,
    requested_capacity: Decimal,
    exclude_rental_id: Optional[int] = None
) -> dict:
    space = db.query(StorageSpace).filter(StorageSpace.id == space_id).first()
    if not space:
        raise ValueError("Storage space not found.")

    # Overlap logic: existing.start_date < requested.end_date AND existing.end_date > requested.start_date
    query = db.query(func.coalesce(func.sum(RentalRequest.requested_capacity), 0)).filter(
        RentalRequest.space_id == space_id,
        RentalRequest.status == RentalStatus.approved,
        RentalRequest.start_date < end_date,
        RentalRequest.end_date > start_date
    )

    if exclude_rental_id:
        query = query.filter(RentalRequest.id != exclude_rental_id)

    used_capacity = Decimal(query.scalar() or 0)
    projected = used_capacity + Decimal(requested_capacity)
    total_capacity = Decimal(space.total_capacity)

    return {
        "ok": projected <= total_capacity,
        "used": used_capacity,
        "projected": projected,
        "total": total_capacity,
        "space_name": space.name
    }