from pydantic import BaseModel


class MessageOut(BaseModel):
    message: str


class PaginatedMeta(BaseModel):
    total: int
    page: int
    page_size: int
