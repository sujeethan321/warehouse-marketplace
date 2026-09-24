# backend/app/routers/imports.py
import csv
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal, InvalidOperation

from app.database import get_db
from app.models.user import User, UserRole
from app.models.space import StorageSpace, AvailabilityEnum
from app.models.import_batch import ImportBatch, ImportError
from app.auth.security import require_role

router = APIRouter(prefix="/api/spaces/import", tags=["Imports"])

REQUIRED_HEADERS = {"unique_code", "name", "total_capacity", "unit", "unit_price", "location", "availability"}

@router.post("")
def import_spaces_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    if not REQUIRED_HEADERS.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail=f"CSV missing required headers: {REQUIRED_HEADERS}")

    batch = ImportBatch(owner_id=current_user.id, file_name=file.filename)
    db.add(batch)
    db.flush()

    seen_codes = set()
    valid_rows = 0
    invalid_rows = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        row_errors = []
        code = row.get("unique_code", "").strip()
        name = row.get("name", "").strip()
        unit = row.get("unit", "").strip()
        loc = row.get("location", "").strip()
        avail = row.get("availability", "").strip().lower()

        if not code or not name or not unit or not loc:
            row_errors.append("Missing required string fields")

        try:
            tot_cap = Decimal(row.get("total_capacity", "0"))
            if tot_cap <= 0:
                row_errors.append("total_capacity must be > 0")
        except InvalidOperation:
            row_errors.append("Invalid total_capacity decimal value")

        try:
            u_price = Decimal(row.get("unit_price", "0"))
            if u_price <= 0:
                row_errors.append("unit_price must be > 0")
        except InvalidOperation:
            row_errors.append("Invalid unit_price decimal value")

        if avail not in [e.value for e in AvailabilityEnum]:
            row_errors.append(f"Invalid availability enum value: {avail}")

        if code in seen_codes or db.query(StorageSpace).filter(StorageSpace.unique_code == code).first():
            row_errors.append(f"Duplicate unique_code: '{code}'")
        else:
            seen_codes.add(code)

        if row_errors:
            invalid_rows += 1
            err_msg = "; ".join(row_errors)
            db.add(ImportError(batch_id=batch.id, row_num=idx, error_message=err_msg))
            errors.append({"row": idx, "error": err_msg})
        else:
            valid_rows += 1
            db.add(StorageSpace(
                owner_id=current_user.id,
                unique_code=code,
                name=name,
                total_capacity=tot_cap,
                unit=unit,
                unit_price=u_price,
                location=loc,
                availability=AvailabilityEnum(avail)
            ))

    batch.total_rows = valid_rows + invalid_rows
    batch.valid_rows = valid_rows
    batch.invalid_rows = invalid_rows

    db.commit()

    return {
        "batch_id": batch.id,
        "total_rows": batch.total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "errors": errors
    }