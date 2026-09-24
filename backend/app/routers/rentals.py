# backend/app/routers/rentals.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.database import get_db
from app.models.rental import RentalRequest, RentalStatus, RentalStatusHistory
from app.models.space import StorageSpace
from app.models.user import User, UserRole
from app.schemas.rental import RentalCreate, RentalResponse, RentalStatusUpdate
from app.auth.security import get_current_user, require_role
from app.services.capacity import check_capacity

router = APIRouter(prefix="/api", tags=["Rentals"])

# Allowed state transition map strictly enforced
VALID_TRANSITIONS = {
    RentalStatus.pending: [RentalStatus.approved, RentalStatus.rejected, RentalStatus.cancelled],
    RentalStatus.approved: [RentalStatus.cancelled],
    RentalStatus.rejected: [],
    RentalStatus.cancelled: []
}

@router.post("/rentals", response_model=RentalResponse, status_code=201)
def create_rental_request(
    rental_in: RentalCreate,
    current_user: User = Depends(require_role(UserRole.customer)),
    db: Session = Depends(get_db)
):
    if rental_in.end_date <= rental_in.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    space = db.query(StorageSpace).filter(StorageSpace.id == rental_in.space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Auto calculation of price based on duration in days
    days = (rental_in.end_date - rental_in.start_date).days
    total_price = Decimal(days) * Decimal(space.unit_price) * Decimal(rental_in.requested_capacity)

    rental = RentalRequest(
        customer_id=current_user.id,
        space_id=rental_in.space_id,
        requested_capacity=rental_in.requested_capacity,
        start_date=rental_in.start_date,
        end_date=rental_in.end_date,
        status=RentalStatus.pending,
        total_price=total_price
    )
    db.add(rental)
    db.commit()
    db.refresh(rental)
    return rental

@router.get("/rentals/my", response_model=List[RentalResponse])
def get_customer_rentals(
    current_user: User = Depends(require_role(UserRole.customer)),
    db: Session = Depends(get_db)
):
    return db.query(RentalRequest).filter(RentalRequest.customer_id == current_user.id).all()

@router.get("/owner/rentals", response_model=List[RentalResponse])
def get_owner_rental_requests(
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db)
):
    return db.query(RentalRequest).join(StorageSpace).filter(StorageSpace.owner_id == current_user.id).all()

@router.patch("/rentals/{rental_id}/status", response_model=RentalResponse)
def update_rental_status(
    rental_id: int,
    status_update: RentalStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Transaction boundary
    with db.begin_nested():
        # SELECT ... FOR UPDATE to avoid approval race conditions on concurrent requests
        rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).with_for_update().first()
        if not rental:
            raise HTTPException(status_code=404, detail="Rental request not found")

        space = db.query(StorageSpace).filter(StorageSpace.id == rental.space_id).first()

        # Authorization Checks
        if current_user.role == UserRole.owner and space.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to alter this rental request")
        if current_user.role == UserRole.customer and rental.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to alter this rental request")

        new_status = status_update.status
        old_status = rental.status

        # Transition map enforcement
        if new_status not in VALID_TRANSITIONS.get(old_status, []):
            raise HTTPException(status_code=400, detail=f"Invalid transition from {old_status.value} to {new_status.value}")

        # If transition is APPROVAL, re-verify capacity inside transaction
        if new_status == RentalStatus.approved:
            cap_check = check_capacity(
                db,
                space_id=rental.space_id,
                start_date=rental.start_date,
                end_date=rental.end_date,
                requested_capacity=rental.requested_capacity,
                exclude_rental_id=rental.id
            )
            if not cap_check["ok"]:
                raise HTTPException(
                    status_code=409,
                    detail=f"Capacity overbooked. Available: {cap_check['total'] - cap_check['used']}, Requested: {rental.requested_capacity}"
                )

        # Update state and write audit trail
        rental.status = new_status
        history = RentalStatusHistory(
            rental_id=rental.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=current_user.id
        )
        db.add(history)

    db.commit()
    db.refresh(rental)
    return rental