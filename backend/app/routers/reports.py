# backend/app/routers/reports.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.space import StorageSpace
from app.models.rental import RentalRequest, RentalStatus
from app.auth.security import require_role

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/utilisation")
def get_utilisation_report(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    spaces = db.query(StorageSpace).filter(StorageSpace.owner_id == current_user.id).all()
    results = []

    for space in spaces:
        used = db.query(func.coalesce(func.sum(RentalRequest.requested_capacity), 0)).filter(
            RentalRequest.space_id == space.id,
            RentalRequest.status == RentalStatus.approved
        ).scalar()

        pct = (float(used) / float(space.total_capacity) * 100) if space.total_capacity > 0 else 0.0
        results.append({
            "space_id": space.id,
            "space_name": space.name,
            "total_capacity": float(space.total_capacity),
            "used_capacity": float(used),
            "utilisation_percentage": round(pct, 2)
        })

    return results

@router.get("/revenue")
def get_revenue_report(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    revenue = db.query(
        StorageSpace.name.label("space_name"),
        func.coalesce(func.sum(RentalRequest.total_price), 0).label("total_revenue")
    ).join(RentalRequest, RentalRequest.space_id == StorageSpace.id)\
     .filter(StorageSpace.owner_id == current_user.id, RentalRequest.status == RentalStatus.approved)\
     .group_by(StorageSpace.id).all()

    return [{"space_name": name, "total_revenue": float(rev)} for name, rev in revenue]