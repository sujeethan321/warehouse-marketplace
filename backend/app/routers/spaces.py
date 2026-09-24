# backend/app/routers/spaces.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models.space import StorageSpace
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreate, SpaceUpdate, SpaceResponse
from app.auth.security import get_current_user, require_role
from app.services.capacity import check_capacity

router = APIRouter(prefix="/api/spaces", tags=["Spaces"])

@router.get("", response_model=List[SpaceResponse])
def list_spaces(
    location: Optional[str] = None,
    min_capacity: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    availability: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(StorageSpace)
    if location:
        query = query.filter(StorageSpace.location.ilike(f"%{location}%"))
    if min_capacity:
        query = query.filter(StorageSpace.total_capacity >= min_capacity)
    if max_price:
        query = query.filter(StorageSpace.unit_price <= max_price)
    if availability:
        query = query.filter(StorageSpace.availability == availability)
    return query.all()

@router.post("", response_model=SpaceResponse, status_code=201)
def create_space(
    space_in: SpaceCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    if db.query(StorageSpace).filter(StorageSpace.unique_code == space_in.unique_code).first():
        raise HTTPException(status_code=400, detail="Space with this unique code already exists")

    space = StorageSpace(**space_in.dict(), owner_id=current_user.id)
    db.add(space)
    db.commit()
    db.refresh(space)
    return space

@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(space_id: int, db: Session = Depends(get_db)):
    space = db.query(StorageSpace).filter(StorageSpace.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space

@router.put("/{space_id}", response_model=SpaceResponse)
def update_space(
    space_id: int,
    space_in: SpaceUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    space = db.query(StorageSpace).filter(StorageSpace.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this space")

    for field, value in space_in.dict(exclude_unset=True).items():
        setattr(space, field, value)

    db.commit()
    db.refresh(space)
    return space

@router.get("/{space_id}/availability")
def check_space_availability(
    space_id: int,
    start_date: date,
    end_date: date,
    requested_capacity: Decimal = Query(Decimal("1.0")),
    db: Session = Depends(get_db)
):
    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than start_date")
    try:
        return check_capacity(db, space_id, start_date, end_date, requested_capacity)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))