from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserManagementOut(BaseModel):
    id: int
    email: EmailStr
    username: str | None = None
    bio_name: str | None = None
    full_name: str
    role: str
    is_active: bool
    created_at: datetime | None = None
    searches_count: int = 0

    model_config = {"from_attributes": True}


class RoleUpdateRequest(BaseModel):
    role: str = Field(pattern="^(admin|user)$")
    secret_password: str | None = None


class StatusUpdateRequest(BaseModel):
    is_active: bool
    secret_password: str | None = None


class AdminSecretConfirmRequest(BaseModel):
    secret_password: str


class PatentManagementOut(BaseModel):
    id: int
    patent_id: str
    title: str | None = None
    country: str | None = None
    publication_date: str | None = None
    claims_count: int = 0
    chunks_count: int = 0

    model_config = {"from_attributes": True}


class SinglePatentCreateRequest(BaseModel):
    patent_id: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=2, max_length=500)
    abstract: str | None = ""
    claims: str | None = ""
    description: str | None = ""
    inventor: str | None = ""
    country: str | None = "US"
    publication_date: str | None = None
    publication_number: str | None = None
    source_url: str | None = None


class CsvValidationOut(BaseModel):
    is_valid: bool
    expected_columns: list[str]
    detected_columns: list[str]
    missing_columns: list[str]
    total_rows: int
    preview: list[dict]
    message: str


class IngestionResultOut(BaseModel):
    created: int
    updated: int
    skipped: int
    message: str


class IndexRebuildOut(BaseModel):
    success: bool
    total_vectors: int
    dimension: int
    message: str


class GlobalSearchItem(BaseModel):
    id: int
    user_email: str
    user_name: str
    query_title: str | None = "Untitled Search"
    results_count: int = 0
    created_at: datetime | None = None


class AdminOverviewOut(BaseModel):
    stats: dict
    health: dict
    recent_searches: list[GlobalSearchItem]


class IngestionHistoryItemOut(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None = None
    username: str | None = None
    user_email: str | None = None
    ingestion_type: str  # "single" or "bulk"
    status: str = "completed"
    summary: str
    details: dict | None = None
    has_file: bool = False
    filename: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class IngestionHistoryListOut(BaseModel):
    items: list[IngestionHistoryItemOut]
    total: int
    page: int
    page_size: int
