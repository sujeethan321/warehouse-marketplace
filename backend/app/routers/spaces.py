from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth.security import require_owner
from app.database import get_db
from app.models.rental import RentalRequest
from app.models.space import StorageSpace
from app.models.user import User
from app.schemas.space import AvailabilityOut, SpaceIn, SpaceOut
from app.services.capacity import daily_usage, fetch_overlapping, peak_usage

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


def _to_out(s: StorageSpace, used: Decimal | None = None) -> dict:
    data = SpaceOut.model_validate(s).model_dump()
    data["owner_name"] = s.owner.name if s.owner else None
    if used is not None:
        data["used_capacity"] = float(used)
        data["available_capacity"] = float(max(Decimal(s.total_capacity) - used, Decimal("0")))
    return data


def _decorate(db: Session, spaces: list[StorageSpace], start: date | None, end: date | None) -> list[dict]:
    """Attach used/available capacity: peak in [start,end) or, by default, today."""
    if not start or not end:
        start, end = date.today(), date.today() + timedelta(days=1)
    rentals = fetch_overlapping(db, [s.id for s in spaces], start, end)
    return [_to_out(s, peak_usage(rentals.get(s.id, []), start, end)) for s in spaces]


def _get_space_or_404(db: Session, space_id: int) -> StorageSpace:
    space = db.get(StorageSpace, space_id)
    if space is None:
        raise HTTPException(404, "Storage space not found")
    return space


def _assert_owner(space: StorageSpace, user: User):
    # Explicit ownership check on every mutation.
    if space.owner_id != user.id:
        raise HTTPException(403, "You can only manage your own spaces")


# ---------------- public browsing ----------------
@router.get("", response_model=list[SpaceOut])
def list_spaces(
    q: str | None = None,
    location: str | None = None,
    min_capacity: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    availability: str | None = Query(None, pattern="^(available|unavailable)$"),
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
):
    if (start is None) != (end is None):
        raise HTTPException(400, "Provide both start and end, or neither")
    if start and end and end <= start:
        raise HTTPException(400, "End date must be after the start date")

    stmt = select(StorageSpace).order_by(StorageSpace.created_at.desc(), StorageSpace.id.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(StorageSpace.name.ilike(like), StorageSpace.location.ilike(like), StorageSpace.unique_code.ilike(like))
        )
    if location:
        stmt = stmt.where(StorageSpace.location.ilike(f"%{location.strip()}%"))
    if max_price is not None:
        stmt = stmt.where(StorageSpace.unit_price <= max_price)
    if availability:
        stmt = stmt.where(StorageSpace.availability == availability)

    spaces = list(db.execute(stmt.limit(500)).scalars())
    result = _decorate(db, spaces, start, end)
    if min_capacity:
        result = [r for r in result if r["available_capacity"] >= min_capacity]
    return result


@router.get("/mine", response_model=list[SpaceOut])
def my_spaces(user: User = Depends(require_owner), db: Session = Depends(get_db)):
    spaces = list(
        db.execute(
            select(StorageSpace).where(StorageSpace.owner_id == user.id).order_by(StorageSpace.id.desc())
        ).scalars()
    )
    return _decorate(db, spaces, None, None)


@router.get("/{space_id}", response_model=SpaceOut)
def get_space(space_id: int, db: Session = Depends(get_db)):
    space = _get_space_or_404(db, space_id)
    return _decorate(db, [space], None, None)[0]


@router.get("/{space_id}/availability", response_model=AvailabilityOut)
def space_availability(space_id: int, start: date, end: date, db: Session = Depends(get_db)):
    """Runs the overlap query: how much of this space is still free in [start, end)."""
    if end <= start:
        raise HTTPException(400, "End date must be after the start date")
    space = _get_space_or_404(db, space_id)
    rentals = fetch_overlapping(db, [space.id], start, end).get(space.id, [])
    used = peak_usage(rentals, start, end)
    total = Decimal(space.total_capacity)

    timeline = None
    if (end - start).days <= 120:
        timeline = [
            {"date": d, "used": float(u), "available": float(max(total - u, Decimal("0")))}
            for d, u in daily_usage(rentals, start, end)
        ]
    return {
        "space_id": space.id,
        "start": start,
        "end": end,
        "total_capacity": float(total),
        "unit": space.unit,
        "used": float(used),
        "available": float(max(total - used, Decimal("0"))),
        "timeline": timeline,
    }


# ---------------- owner only ----------------
def _code_taken(db: Session, code: str, exclude_id: int | None = None) -> bool:
    stmt = select(func.count()).select_from(StorageSpace).where(StorageSpace.unique_code == code)
    if exclude_id:
        stmt = stmt.where(StorageSpace.id != exclude_id)
    return db.execute(stmt).scalar_one() > 0


@router.post("", response_model=SpaceOut, status_code=201)
def create_space(payload: SpaceIn, user: User = Depends(require_owner), db: Session = Depends(get_db)):
    if _code_taken(db, payload.unique_code):
        raise HTTPException(409, f"unique_code '{payload.unique_code}' is already in use")
    space = StorageSpace(
        owner_id=user.id,
        unique_code=payload.unique_code,
        name=payload.name,
        total_capacity=Decimal(str(payload.total_capacity)),
        unit=payload.unit,
        unit_price=Decimal(str(payload.unit_price)),
        location=payload.location,
        availability=payload.availability,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return _decorate(db, [space], None, None)[0]


@router.put("/{space_id}", response_model=SpaceOut)
def update_space(
    space_id: int, payload: SpaceIn, user: User = Depends(require_owner), db: Session = Depends(get_db)
):
    space = _get_space_or_404(db, space_id)
    _assert_owner(space, user)
    if _code_taken(db, payload.unique_code, exclude_id=space.id):
        raise HTTPException(409, f"unique_code '{payload.unique_code}' is already in use")

    new_capacity = Decimal(str(payload.total_capacity))
    if new_capacity < Decimal(space.total_capacity):
        # Never allow shrinking below what is already approved for the future.
        today = date.today()
        far = today + timedelta(days=3650)
        booked = fetch_overlapping(db, [space.id], today, far).get(space.id, [])
        peak = peak_usage(booked, today, far)
        if peak > new_capacity:
            raise HTTPException(
                409, f"Cannot reduce capacity below {float(peak):g} - that much is already approved for rental"
            )

    space.unique_code = payload.unique_code
    space.name = payload.name
    space.total_capacity = new_capacity
    space.unit = payload.unit
    space.unit_price = Decimal(str(payload.unit_price))
    space.location = payload.location
    space.availability = payload.availability
    db.commit()
    db.refresh(space)
    return _decorate(db, [space], None, None)[0]


@router.delete("/{space_id}", status_code=204)
def delete_space(space_id: int, user: User = Depends(require_owner), db: Session = Depends(get_db)):
    space = _get_space_or_404(db, space_id)
    _assert_owner(space, user)
    has_rentals = db.execute(
        select(func.count()).select_from(RentalRequest).where(RentalRequest.space_id == space.id)
    ).scalar_one()
    if has_rentals:
        raise HTTPException(409, "This space has rental history and cannot be deleted. Mark it unavailable instead.")
    db.delete(space)
    db.commit()
