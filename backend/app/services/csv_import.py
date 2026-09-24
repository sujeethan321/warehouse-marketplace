import csv
import io
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.import_batch import ImportBatch
from app.models.import_error import ImportError as ImportErrorRow
from app.models.space import StorageSpace
from app.models.user import User

EXPECTED_HEADERS = ["unique_code", "name", "total_capacity", "unit", "unit_price", "location", "availability"]
ALLOWED_AVAILABILITY = {"available", "unavailable"}
MAX_ROWS = 5000
MAX_BYTES = 1_000_000
MAX_LEN = {"unique_code": 50, "name": 150, "unit": 50, "location": 255}
MAX_NUMBER = Decimal("99999999.99")  # fits DECIMAL(10,2)


def _positive_number(value: str, field: str) -> Decimal:
    try:
        num = Decimal(value)
    except InvalidOperation:
        raise ValueError(f"{field} must be a number (got '{value}')")
    if not num.is_finite():
        raise ValueError(f"{field} must be a number (got '{value}')")
    if num <= 0:
        raise ValueError(f"{field} must be greater than 0 (got {value})")
    if num > MAX_NUMBER:
        raise ValueError(f"{field} is too large")
    return num.quantize(Decimal("0.01"))


def validate_row(raw: dict, seen_codes: set[str], existing_codes: set[str]) -> tuple[dict | None, str | None]:
    """Returns (clean_row, None) or (None, error_message)."""
    if None in raw:
        return None, "Row has more columns than the header"

    # trim whitespace
    row = {k: (v.strip() if isinstance(v, str) else v) for k, v in raw.items()}

    # required fields present
    missing = [f for f in EXPECTED_HEADERS if row.get(f) in (None, "")]
    if missing:
        return None, "Missing required value: " + ", ".join(missing)

    for field, limit in MAX_LEN.items():
        if len(row[field]) > limit:
            return None, f"{field} is too long (max {limit} characters)"

    try:
        capacity = _positive_number(row["total_capacity"], "total_capacity")
        price = _positive_number(row["unit_price"], "unit_price")
    except ValueError as e:
        return None, str(e)

    availability = row["availability"].lower()
    if availability not in ALLOWED_AVAILABILITY:
        return None, f"availability must be 'available' or 'unavailable' (got '{row['availability']}')"

    code = row["unique_code"]
    if code.lower() in seen_codes:
        return None, f"Duplicate unique_code '{code}' inside this file"
    if code.lower() in existing_codes:
        return None, f"unique_code '{code}' already exists in the system"

    return (
        {
            "unique_code": code,
            "name": row["name"],
            "total_capacity": capacity,
            "unit": row["unit"],
            "unit_price": price,
            "location": row["location"],
            "availability": availability,
        },
        None,
    )


def import_spaces(db: Session, owner: User, file_name: str, content: bytes) -> dict:
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "File is too large (max 1 MB)")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "File must be a UTF-8 encoded CSV")

    # 1. proper CSV parser (handles quoted fields)
    reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)

    # 2. header must match exactly (whitespace around names is ignored)
    headers = [(h or "").strip() for h in (reader.fieldnames or [])]
    if headers != EXPECTED_HEADERS:
        missing = [h for h in EXPECTED_HEADERS if h not in headers]
        extra = [h for h in headers if h not in EXPECTED_HEADERS]
        parts = []
        if missing:
            parts.append("missing column(s): " + ", ".join(missing))
        if extra:
            parts.append("unexpected column(s): " + ", ".join(extra))
        if not parts:
            parts.append("columns are in the wrong order")
        raise HTTPException(
            400, "Invalid header - " + "; ".join(parts) + ". Expected: " + ", ".join(EXPECTED_HEADERS)
        )
    reader.fieldnames = headers

    rows = list(reader)
    if len(rows) > MAX_ROWS:
        raise HTTPException(400, f"Too many rows (max {MAX_ROWS} per file)")

    codes_in_file = [
        (r.get("unique_code") or "").strip().lower() for r in rows if isinstance(r.get("unique_code"), str)
    ]
    existing_codes: set[str] = set()
    if codes_in_file:
        found = db.execute(select(StorageSpace.unique_code)).scalars().all()
        existing_codes = {c.lower() for c in found}

    # 3. per-row validation - a bad row never rejects the whole file
    valid_rows: list[dict] = []
    errors: list[tuple[int, str]] = []
    seen: set[str] = set()
    for idx, raw in enumerate(rows):
        row_number = idx + 2  # header is row 1
        clean, error = validate_row(raw, seen, existing_codes)
        if error:
            errors.append((row_number, error[:500]))
            continue
        seen.add(clean["unique_code"].lower())
        valid_rows.append(clean)

    # 4. single transaction: batch record + errors + all valid spaces
    batch = ImportBatch(
        owner_id=owner.id,
        file_name=file_name[:255],
        total_rows=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=len(errors),
    )
    db.add(batch)
    db.flush()
    db.add_all(ImportErrorRow(batch_id=batch.id, row_num=n, error_message=m) for n, m in errors)
    db.add_all(StorageSpace(owner_id=owner.id, **row) for row in valid_rows)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A unique_code was added by someone else while importing. Please try again.")

    # 5. summary
    return {
        "batch_id": batch.id,
        "file_name": batch.file_name,
        "total": len(rows),
        "valid": len(valid_rows),
        "invalid": len(errors),
        "errors": [{"row": n, "error": m} for n, m in errors],
    }
