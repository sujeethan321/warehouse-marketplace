from typing import Generic, TypeVar

from pydantic import BaseModel

from app.schemas.rental import RentalOut

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class AdminSummary(BaseModel):
    customers: int
    owners: int
    storage_spaces: int
    rental_requests: int


class AdminRentalOut(RentalOut):
    owner_name: str
    owner_email: str
