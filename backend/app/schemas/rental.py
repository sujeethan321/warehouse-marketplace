from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class RentalCreate(BaseModel):
    space_id: int
    requested_capacity: float = Field(gt=0, lt=100_000_000)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after the start date")
        return self


class StatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "cancelled"]


class HistoryOut(BaseModel):
    old_status: str | None
    new_status: str
    changed_by: int
    changed_by_name: str | None = None
    changed_at: datetime | None


class CapacityInfo(BaseModel):
    ok: bool
    used: float
    projected: float
    total: float
    available: float


class RentalOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str | None = None
    customer_email: str | None = None
    space_id: int
    space_name: str
    space_code: str
    space_location: str
    space_owner_id: int
    unit: str
    unit_price: float
    requested_capacity: float
    start_date: date
    end_date: date
    days: int
    status: str
    total_price: float
    created_at: datetime | None = None
    history: list[HistoryOut] | None = None
    capacity: CapacityInfo | None = None


# Backwards-compatible aliases used by the router layer.
RentalStatusUpdate = StatusUpdate
RentalResponse = RentalOut
