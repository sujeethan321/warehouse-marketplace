from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rental import APPROVED, PENDING, RentalRequest
from app.models.space import StorageSpace
from app.services.capacity import daily_usage, fetch_overlapping, peak_usage

MAX_RANGE_DAYS = 366


def _normalise_range(start: date | None, end: date | None) -> tuple[date, date]:
    start = start or date.today()
    end = end or (start + timedelta(days=30))
    if end <= start:
        raise HTTPException(400, "End date must be after the start date")
    if (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(400, f"Date range is too long (max {MAX_RANGE_DAYS} days)")
    return start, end


def _owner_spaces(db: Session, owner_id: int, space_id: int | None = None) -> list[StorageSpace]:
    stmt = select(StorageSpace).where(StorageSpace.owner_id == owner_id).order_by(StorageSpace.id)
    if space_id is not None:
        stmt = stmt.where(StorageSpace.id == space_id)
    return list(db.execute(stmt).scalars())


def utilisation_report(db: Session, owner_id: int, start: date | None, end: date | None, space_id: int | None):
    """used_capacity / total_capacity * 100 per space (average over the date range)."""
    start, end = _normalise_range(start, end)
    spaces = _owner_spaces(db, owner_id, space_id)
    rentals = fetch_overlapping(db, [s.id for s in spaces], start, end)
    days = (end - start).days

    rows = []
    tot_avg = Decimal("0")
    tot_cap = Decimal("0")
    for s in spaces:
        rs = rentals.get(s.id, [])
        series = daily_usage(rs, start, end)
        avg_used = sum((u for _, u in series), Decimal("0")) / days
        total = Decimal(s.total_capacity)
        rows.append(
            {
                "space_id": s.id,
                "unique_code": s.unique_code,
                "name": s.name,
                "location": s.location,
                "unit": s.unit,
                "availability": s.availability,
                "total_capacity": float(total),
                "avg_used": round(float(avg_used), 2),
                "peak_used": float(peak_usage(rs, start, end)),
                "utilisation_pct": round(float(avg_used / total * 100), 1),
            }
        )
        tot_avg += avg_used
        tot_cap += total
    overall = round(float(tot_avg / tot_cap * 100), 1) if tot_cap else 0.0
    return {"start": start, "end": end, "overall_utilisation_pct": overall, "spaces": rows}


def occupancy_report(
    db: Session, owner_id: int, start: date | None, end: date | None, space_id: int | None, bucket: str = "day"
):
    """Occupied vs available capacity per date bucket. Uses the same overlap-aware logic."""
    start, end = _normalise_range(start, end)
    spaces = _owner_spaces(db, owner_id, space_id)
    total = sum((Decimal(s.total_capacity) for s in spaces), Decimal("0"))
    rentals = fetch_overlapping(db, [s.id for s in spaces], start, end)

    per_day: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
    for s in spaces:
        for d, used in daily_usage(rentals.get(s.id, []), start, end):
            per_day[d] += used

    def bucket_key(d: date) -> date:
        if bucket == "week":
            return d - timedelta(days=d.weekday())  # Monday
        if bucket == "month":
            return d.replace(day=1)
        return d

    grouped: dict[date, list[Decimal]] = defaultdict(list)
    d = start
    while d < end:
        grouped[bucket_key(d)].append(per_day[d])
        d += timedelta(days=1)

    points = []
    for key in sorted(grouped):
        vals = grouped[key]
        occupied = sum(vals, Decimal("0")) / len(vals)
        points.append(
            {
                "date": key,
                "occupied": round(float(occupied), 2),
                "available": round(float(max(total - occupied, Decimal("0"))), 2),
                "total": float(total),
                "occupancy_pct": round(float(occupied / total * 100), 1) if total else 0.0,
            }
        )
    return {"start": start, "end": end, "bucket": bucket, "total_capacity": float(total), "points": points}


def revenue_report(
    db: Session,
    owner_id: int,
    status: str | None,
    start: date | None,
    end: date | None,
    space_id: int | None,
):
    """Rental history joined to customer + space. Revenue counts APPROVED rentals only."""
    stmt = (
        select(RentalRequest)
        .join(StorageSpace, StorageSpace.id == RentalRequest.space_id)
        .where(StorageSpace.owner_id == owner_id)
        .order_by(RentalRequest.start_date.desc(), RentalRequest.id.desc())
    )
    if status:
        stmt = stmt.where(RentalRequest.status == status)
    if start:
        stmt = stmt.where(RentalRequest.start_date >= start)
    if end:
        stmt = stmt.where(RentalRequest.start_date < end)
    if space_id:
        stmt = stmt.where(RentalRequest.space_id == space_id)
    rentals = list(db.execute(stmt).scalars())

    revenue = Decimal("0")
    pending_value = Decimal("0")
    by_month: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    by_space: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    by_status: dict[str, int] = defaultdict(int)
    rows = []
    for r in rentals:
        by_status[r.status] += 1
        price = Decimal(r.total_price)
        if r.status == APPROVED:
            revenue += price
            by_month[r.start_date.strftime("%Y-%m")] += price
            by_space[r.space.name] += price
        elif r.status == PENDING:
            pending_value += price
        rows.append(
            {
                "rental_id": r.id,
                "customer_name": r.customer.name,
                "customer_email": r.customer.email,
                "space_id": r.space_id,
                "space_name": r.space.name,
                "space_code": r.space.unique_code,
                "unit": r.space.unit,
                "requested_capacity": float(r.requested_capacity),
                "start_date": r.start_date,
                "end_date": r.end_date,
                "status": r.status,
                "total_price": float(price),
            }
        )

    return {
        "totals": {
            "revenue": float(revenue),
            "pending_value": float(pending_value),
            "count": len(rows),
            "by_status": dict(by_status),
        },
        "by_month": [{"month": m, "revenue": float(v)} for m, v in sorted(by_month.items())],
        "by_space": [
            {"space": n, "revenue": float(v)} for n, v in sorted(by_space.items(), key=lambda kv: -kv[1])
        ],
        "rows": rows,
    }
