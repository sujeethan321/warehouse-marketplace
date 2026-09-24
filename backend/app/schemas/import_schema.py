from pydantic import BaseModel


class ImportRowError(BaseModel):
    row: int
    error: str


class ImportSummary(BaseModel):
    batch_id: int
    file_name: str
    total: int
    valid: int
    invalid: int
    errors: list[ImportRowError]
