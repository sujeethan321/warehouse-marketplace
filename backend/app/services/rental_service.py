from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rental import (
    ALLOWED_TRANSITIONS,
    APPROVED,
    CANCELLED,
    PENDING,
    REJECTED,
    RentalRequest,
)
from app.models.rental_history import RentalStatusHistory
from app.models.space import AVAILABLE, StorageSpace
from app.models.user import ROLE_CUSTOMER, ROLE_OWNER, User
from app.schemas.rental import RentalCreate
from app.services.capacity import check_capacity


def calculate_price(unit_price, capacity, start: date, end: date) -> Decimal:
    """price = capacity x unit_price x nights.  end is exclusive, so nights = end - start.
    (unit_price is 'per unit per day'.) Rounded to 2 decimals, half up."""
    days = (end - start).days
    total = Decimal(str(capacity)) * Decimal(unit_price) * days
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def serialize_rental(r: RentalRequest, with_history: bool = False, capacity: dict | None = None) -> dict:
    data = {
        "id": r.id,
        "customer_id": r.customer_id,
        "customer_name": r.customer.name if r.customer else None,
        "customer_email": r.customer.email if r.customer else None,
        "space_id": r.space_id,
        "space_name": r.space.name,
        "space_code": r.space.unique_code,
        "space_location": r.space.location,
        "space_owner_id": r.space.owner_id,
        "unit": r.space.unit,
        "unit_price": float(r.space.unit_price),
        "requested_capacity": float(r.requested_capacity),
        "start_date": r.start_date,
        "end_date": r.end_date,
        "days": (r.end_date - r.start_date).days,
        "status": r.status,
        "total_price": float(r.total_price),
        "created_at": r.created_at,
        "history": None,
        "capacity": capacity,
    }
    if with_history:
        data["history"] = [
            {
                "old_status": h.old_status,
                "new_status": h.new_status,
                "changed_by": h.changed_by,
                "changed_by_name": h.user.name if h.user else None,
                "changed_at": h.changed_at,
            }
            for h in r.history
        ]
    return data


def create_rental(db: Session, customer: User, payload: RentalCreate) -> dict:
    space = db.get(StorageSpace, payload.space_id)
    if space is None:
        raise HTTPException(404, "Storage space not found")
    if space.availability != AVAILABLE:
        raise HTTPException(400, "This space is not accepting requests right now")
    if payload.start_date < date.today():
        raise HTTPException(400, "Start date cannot be in the past")
    if Decimal(str(payload.requested_capacity)) > Decimal(space.total_capacity):
        raise HTTPException(400, f"This space only has {float(space.total_capacity):g} {space.unit} in total")

    # Price is ALWAYS computed here - never trusted from the client.
    price = calculate_price(space.unit_price, payload.requested_capacity, payload.start_date, payload.end_date)

    rental = RentalRequest(
        customer_id=customer.id,
        space_id=space.id,
        requested_capacity=Decimal(str(payload.requested_capacity)),
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=PENDING,
        total_price=price,
    )
    db.add(rental)
    db.flush()
    db.add(RentalStatusHistory(rental_id=rental.id, old_status=None, new_status=PENDING, changed_by=customer.id))
    # Soft check: informational only, the binding check happens on approval.
    soft = check_capacity(db, space.id, payload.start_date, payload.end_date, payload.requested_capacity)
    db.commit()
    db.refresh(rental)
    return serialize_rental(rental, capacity=soft)


def change_status(db: Session, rental_id: int, new_status: str, user: User) -> dict:
    # Read only the (immutable) space_id first, then lock the space row so that
    # approvals for the same space are serialised. This is the anti-overbooking lock.
    probe = db.execute(select(RentalRequest.space_id).where(RentalRequest.id == rental_id)).first()
    if probe is None:
        raise HTTPException(404, "Rental not found")

    space = db.execute(
        select(StorageSpace).where(StorageSpace.id == probe[0]).with_for_update()
    ).scalar_one()
    rental = db.execute(
        select(RentalRequest)
        .where(RentalRequest.id == rental_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).scalar_one()

    # ---- 1. who is allowed (explicit ownership checks) ----
    is_space_owner = user.role == ROLE_OWNER and space.owner_id == user.id
    is_rental_customer = user.role == ROLE_CUSTOMER and rental.customer_id == user.id

    if new_status in (APPROVED, REJECTED):
        if not is_space_owner:
            db.rollback()
            raise HTTPException(403, "Only the owner of this space can approve or reject requests")
    elif new_status == CANCELLED:
        if rental.status == PENDING:
            allowed = is_rental_customer
        else:
            allowed = is_rental_customer or is_space_owner
        if not allowed:
            db.rollback()
            raise HTTPException(403, "You cannot cancel this rental")

    # ---- 2. is the transition legal ----
    if new_status not in ALLOWED_TRANSITIONS.get(rental.status, set()):
        db.rollback()
        raise HTTPException(400, f"A {rental.status} rental cannot be changed to {new_status}")

    # ---- 3. binding capacity re-check (inside the same transaction, lock held) ----
    if new_status == APPROVED:
        check = check_capacity(
            db,
            rental.space_id,
            rental.start_date,
            rental.end_date,
            rental.requested_capacity,
            exclude_rental_id=rental.id,
            lock=True,
        )
        if not check["ok"]:
            db.rollback()
            raise HTTPException(
                409,
                f"Not enough capacity: {check['used']:g} already booked + "
                f"{float(rental.requested_capacity):g} requested = {check['projected']:g}, "
                f"but the space only has {check['total']:g} {space.unit}.",
            )

    old = rental.status
    rental.status = new_status
    db.add(RentalStatusHistory(rental_id=rental.id, old_status=old, new_status=new_status, changed_by=user.id))
    db.commit()
    db.refresh(rental)
    return serialize_rental(rental, with_history=True)
