from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, aliased, joinedload, selectinload

from app.auth.security import require_admin
from app.database import get_db
from app.models.rental import RentalRequest
from app.models.rental_history import RentalStatusHistory
from app.models.space import StorageSpace
from app.models.user import User
from app.schemas.admin import AdminRentalOut, AdminSummary, Page
from app.schemas.space import SpaceOut
from app.schemas.user import UserOut
from app.services.rental_service import serialize_rental

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])
PageNumber = Annotated[int, Query(ge=1, le=1_000_000)]
PageSize = Annotated[int, Query(ge=1, le=100)]
Search = Annotated[str, Query(max_length=150)]


def paginate(db, stmt, page, page_size, serialize):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [serialize(row) for row in rows], "total": total,
            "page": page, "page_size": page_size}


@router.get("/summary", response_model=AdminSummary)
def summary(db: Session = Depends(get_db)):
    return {
        "customers": db.scalar(select(func.count()).select_from(User).where(User.role == "customer")),
        "owners": db.scalar(select(func.count()).select_from(User).where(User.role == "owner")),
        "storage_spaces": db.scalar(select(func.count()).select_from(StorageSpace)),
        "rental_requests": db.scalar(select(func.count()).select_from(RentalRequest)),
    }


@router.get("/users", response_model=Page[UserOut])
def users(role: Literal["owner", "customer"] | None = None, search: Search = "",
          page: PageNumber = 1, page_size: PageSize = 20, db: Session = Depends(get_db)):
    stmt = select(User).where(User.role.in_(["owner", "customer"]))
    if role:
        stmt = stmt.where(User.role == role)
    if search.strip():
        stmt = stmt.where(or_(User.name.icontains(search.strip(), autoescape=True),
                             User.email.icontains(search.strip(), autoescape=True)))
    return paginate(db, stmt.order_by(User.id.desc()), page, page_size, UserOut.model_validate)


@router.get("/users/{user_id}", response_model=UserOut)
def user_detail(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None or user.role not in ("owner", "customer"):
        raise HTTPException(404, "Customer or owner not found")
    return user


@router.get("/users/{user_id}/spaces", response_model=Page[SpaceOut])
def user_spaces(user_id: int, page: PageNumber = 1, page_size: PageSize = 20,
                db: Session = Depends(get_db)):
    user_detail(user_id, db)
    stmt = select(StorageSpace).where(StorageSpace.owner_id == user_id).order_by(StorageSpace.id.desc())
    return paginate(db, stmt, page, page_size, SpaceOut.model_validate)


def rental_out(rental, history=False):
    return {**serialize_rental(rental, with_history=history),
            "owner_name": rental.space.owner.name, "owner_email": rental.space.owner.email}


def rental_query():
    return select(RentalRequest).options(
        joinedload(RentalRequest.customer),
        joinedload(RentalRequest.space).joinedload(StorageSpace.owner),
    )


@router.get("/rentals", response_model=Page[AdminRentalOut])
def rentals(search: Search = "", status: Literal["pending", "approved", "rejected", "cancelled"] | None = None,
            customer_id: Annotated[int | None, Query(gt=0)] = None,
            owner_id: Annotated[int | None, Query(gt=0)] = None,
            page: PageNumber = 1, page_size: PageSize = 20, db: Session = Depends(get_db)):
    customer, owner = aliased(User), aliased(User)
    stmt = (rental_query().join(StorageSpace, RentalRequest.space_id == StorageSpace.id)
            .join(customer, RentalRequest.customer_id == customer.id)
            .join(owner, StorageSpace.owner_id == owner.id))
    if status:
        stmt = stmt.where(RentalRequest.status == status)
    if customer_id:
        stmt = stmt.where(RentalRequest.customer_id == customer_id)
    if owner_id:
        stmt = stmt.where(StorageSpace.owner_id == owner_id)
    if search.strip():
        stmt = stmt.where(or_(*(column.icontains(search.strip(), autoescape=True) for column in (
            customer.name, customer.email, owner.name, owner.email, StorageSpace.name,
            StorageSpace.unique_code, StorageSpace.location, cast(RentalRequest.id, String)))))
    return paginate(db, stmt.order_by(RentalRequest.created_at.desc(), RentalRequest.id.desc()),
                    page, page_size, rental_out)


@router.get("/rentals/{rental_id}", response_model=AdminRentalOut)
def rental_detail(rental_id: int, db: Session = Depends(get_db)):
    stmt = rental_query().where(RentalRequest.id == rental_id).options(
        selectinload(RentalRequest.history).joinedload(RentalStatusHistory.user))
    rental = db.scalar(stmt)
    if rental is None:
        raise HTTPException(404, "Rental not found")
    return rental_out(rental, history=True)
