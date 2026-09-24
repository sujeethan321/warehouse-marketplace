"""
The overlap engine.

Date convention (used EVERYWHERE - SQL, API, frontend date pickers):
    start_date is inclusive, end_date is EXCLUSIVE ("moves out on this day").
    Two ranges overlap when:  existing.start < requested.end  AND  existing.end > requested.start

Only APPROVED rentals consume capacity.

How usage is measured: the used capacity for a request window is the PEAK number of
units that are booked at the same time inside that window (a sweep over the
overlapping approved rentals). This never allows overbooking, and it does not wrongly
reject a request just because two older rentals overlap the window but never overlap
each other.
"""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rental import CAPACITY_STATUSES, RentalRequest
from app.models.space import StorageSpace


def fetch_overlapping(
    db: Session,
    space_ids: list[int],
    start: date,
    end: date,
    exclude_rental_id: int | None = None,
    lock: bool = False,
) -> dict[int, list[RentalRequest]]:
    """Approved rentals that overlap [start, end), grouped by space id."""
    result: dict[int, list[RentalRequest]] = defaultdict(list)
    if not space_ids:
        return result
    stmt = select(RentalRequest).where(
        RentalRequest.space_id.in_(space_ids),
        RentalRequest.status.in_(CAPACITY_STATUSES),
        RentalRequest.start_date < end,
        RentalRequest.end_date > start,
    )
    if exclude_rental_id is not None:
        stmt = stmt.where(RentalRequest.id != exclude_rental_id)
    if lock:
        # Locking read = always sees the latest committed rows (important on MySQL
        # REPEATABLE READ) and blocks concurrent approvals of the same space.
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    for r in db.execute(stmt).scalars():
        result[r.space_id].append(r)
    return result


def peak_usage(rentals: list[RentalRequest], start: date, end: date) -> Decimal:
    """Maximum simultaneous booked capacity inside [start, end)."""
    events: list[tuple[date, Decimal]] = []
    for r in rentals:
        s = max(r.start_date, start)
        e = min(r.end_date, end)
        if s >= e:
            continue
        cap = Decimal(r.requested_capacity)
        events.append((s, cap))
        events.append((e, -cap))
    # At the same date, moves-out (negative) are processed before moves-in (end is exclusive)
    events.sort(key=lambda ev: (ev[0], ev[1]))
    running = Decimal("0")
    peak = Decimal("0")
    for _, delta in events:
        running += delta
        if running > peak:
            peak = running
    return peak


def daily_usage(rentals: list[RentalRequest], start: date, end: date) -> list[tuple[date, Decimal]]:
    """Booked capacity for each day in [start, end)."""
    out = []
    d = start
    while d < end:
        used = sum(
            (Decimal(r.requested_capacity) for r in rentals if r.start_date <= d < r.end_date),
            Decimal("0"),
        )
        out.append((d, used))
        d += timedelta(days=1)
    return out


def check_capacity(
    db: Session,
    space_id: int,
    start_date: date,
    end_date: date,
    requested_capacity,
    exclude_rental_id: int | None = None,
    lock: bool = False,
) -> dict:
    space = db.get(StorageSpace, space_id)
    if space is None:
        raise ValueError("Space not found")
    overlapping = fetch_overlapping(db, [space_id], start_date, end_date, exclude_rental_id, lock)
    used = peak_usage(overlapping.get(space_id, []), start_date, end_date)
    total = Decimal(space.total_capacity)
    projected = used + Decimal(str(requested_capacity))
    return {
        "ok": projected <= total,
        "used": float(used),
        "projected": float(projected),
        "total": float(total),
        "available": float(max(total - used, Decimal("0"))),
    }
