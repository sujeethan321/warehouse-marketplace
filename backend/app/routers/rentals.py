from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_customer, require_owner
from app.database import get_db
from app.models.rental import RentalRequest
from app.models.space import StorageSpace
from app.models.user import ROLE_CUSTOMER, ROLE_OWNER, User
from app.schemas.rental import RentalCreate, RentalOut, StatusUpdate
from app.services.capacity import check_capacity
from app.services.rental_service import change_status, create_rental, serialize_rental

router = APIRouter(prefix="/api/rentals", tags=["rentals"])
owner_router = APIRouter(prefix="/api/owner", tags=["owner"])


@router.post("", response_model=RentalOut, status_code=201)
def submit_request(payload: RentalCreate, user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return create_rental(db, user, payload)


@router.get("/my", response_model=list[RentalOut])
def my_rentals(
    status: str | None = Query(None, pattern="^(pending|approved|rejected|cancelled)$"),
    user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    stmt = (
        select(RentalRequest)
        .where(RentalRequest.customer_id == user.id)
        .order_by(RentalRequest.created_at.desc(), RentalRequest.id.desc())
    )
    if status:
        stmt = stmt.where(RentalRequest.status == status)
    return [serialize_rental(r) for r in db.execute(stmt).scalars()]


@router.get("/{rental_id}", response_model=RentalOut)
def get_rental(rental_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rental = db.get(RentalRequest, rental_id)
    if rental is None:
        raise HTTPException(404, "Rental not found")
    is_customer = user.role == ROLE_CUSTOMER and rental.customer_id == user.id
    is_owner = user.role == ROLE_OWNER and rental.space.owner_id == user.id
    if not (is_customer or is_owner):
        raise HTTPException(403, "You cannot view this rental")
    capacity = None
    if is_owner:
        capacity = check_capacity(
            db, rental.space_id, rental.start_date, rental.end_date, rental.requested_capacity,
            exclude_rental_id=rental.id,
        )
    return serialize_rental(rental, with_history=True, capacity=capacity)


@router.patch("/{rental_id}/status", response_model=RentalOut)
def update_status(
    rental_id: int, payload: StatusUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return change_status(db, rental_id, payload.status, user)


@owner_router.get("/rentals", response_model=list[RentalOut])
def owner_rentals(
    status: str | None = Query(None, pattern="^(pending|approved|rejected|cancelled)$"),
    user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    stmt = (
        select(RentalRequest)
        .join(StorageSpace, StorageSpace.id == RentalRequest.space_id)
        .where(StorageSpace.owner_id == user.id)
        .order_by(RentalRequest.created_at.desc(), RentalRequest.id.desc())
    )
    if status:
        stmt = stmt.where(RentalRequest.status == status)
    return [serialize_rental(r) for r in db.execute(stmt).scalars()]
