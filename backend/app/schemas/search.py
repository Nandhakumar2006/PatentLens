from datetime import date, datetime

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    title: str = Field(min_length=2, max_length=1000)
    description: str | None = Field(default="", max_length=20000)
    technical_features: list[str] = Field(default_factory=list)
    top_k: int = Field(default=10, ge=1, le=50)
    country: str | None = None
    classification: str | None = None
    date_from: date | None = None
    date_to: date | None = None


class ExcerptOut(BaseModel):
    chunk_type: str
    text: str
    score: float


class PatentResultOut(BaseModel):
    id: int
    patent_id: str
    publication_number: str | None
    title: str | None
    abstract: str | None
    publication_date: date | None
    inventor: str | None
    applicant: str | None
    country: str | None
    ipc_cpc_codes: str | None
    source_url: str | None
    is_synthetic: bool
    similarity_score: float
    excerpts: list[ExcerptOut]


class SearchResponse(BaseModel):
    search_id: int
    title: str | None = None
    description: str | None = None
    technical_features: list[str] = []
    model_name: str
    embedding_backend: str
    result_count: int
    results: list[PatentResultOut]
    disclaimer: str


class SearchHistoryItem(BaseModel):
    id: int
    title: str | None
    description: str | None = None
    model_name: str
    created_at: datetime
    result_count: int

    model_config = {"from_attributes": True}
