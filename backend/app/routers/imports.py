from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth.security import rate_limit, require_owner
from app.database import get_db
from app.models.user import User
from app.schemas.import_schema import ImportSummary
from app.services.csv_import import MAX_BYTES, import_spaces
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/spaces", tags=["import"])


# Rate limited: the second endpoint someone would abuse.
@router.post(
    "/import",
    response_model=ImportSummary,
    dependencies=[Depends(rate_limit("import", 10, 60))],
)
async def import_csv(
    file: UploadFile = File(...),
    user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    name = file.filename or "upload.csv"
    if not name.lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file")
    content = await file.read(MAX_BYTES + 1)
    return import_spaces(db, user, name, content)
