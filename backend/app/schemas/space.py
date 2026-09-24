from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SpaceIn(BaseModel):
    unique_code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    total_capacity: float = Field(gt=0, lt=100_000_000)
    unit: str = Field(min_length=1, max_length=50)
    unit_price: float = Field(gt=0, lt=100_000_000)
    location: str = Field(min_length=1, max_length=255)
    availability: Literal["available", "unavailable"] = "available"

    @field_validator("unique_code", "name", "unit", "location")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v


class SpaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    owner_name: str | None = None
    unique_code: str
    name: str
    total_capacity: float
    unit: str
    unit_price: float
    location: str
    availability: str
    created_at: datetime | None = None
    # Filled in by the list endpoints (peak usage in the requested window, or today)
    used_capacity: float | None = None
    available_capacity: float | None = None


class TimelinePoint(BaseModel):
    date: date
    used: float
    available: float


class AvailabilityOut(BaseModel):
    space_id: int
    start: date
    end: date
    total_capacity: float
    unit: str
    used: float  # peak approved usage inside the window
    available: float
    timeline: list[TimelinePoint] | None = None
