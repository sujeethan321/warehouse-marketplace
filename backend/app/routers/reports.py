from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import require_owner
from app.database import get_db
from app.models.user import User
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])

STATUS_PATTERN = "^(pending|approved|rejected|cancelled)$"


@router.get("/utilisation")
def utilisation(
    start: date | None = None,
    end: date | None = None,
    space_id: int | None = None,
    user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return report_service.utilisation_report(db, user.id, start, end, space_id)


@router.get("/revenue")
def revenue(
    status: str | None = Query(None, pattern=STATUS_PATTERN),
    start: date | None = None,
    end: date | None = None,
    space_id: int | None = None,
    user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return report_service.revenue_report(db, user.id, status, start, end, space_id)


@router.get("/occupancy")
def occupancy(
    start: date | None = None,
    end: date | None = None,
    space_id: int | None = None,
    bucket: str = Query("day", pattern="^(day|week|month)$"),
    user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return report_service.occupancy_report(db, user.id, start, end, space_id, bucket)
