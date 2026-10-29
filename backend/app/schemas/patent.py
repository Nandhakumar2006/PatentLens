from datetime import date, datetime

from pydantic import BaseModel


class ClaimOut(BaseModel):
    id: int
    claim_number: int
    claim_text: str

    model_config = {"from_attributes": True}


class PatentDetailOut(BaseModel):
    id: int
    patent_id: str
    publication_number: str | None
    title: str | None
    abstract: str | None
    claims_text: str | None
    description: str | None
    publication_date: date | None
    ipc_cpc_codes: str | None
    inventor: str | None
    applicant: str | None
    country: str | None
    source_url: str | None
    is_synthetic: bool
    saved: bool = False

    model_config = {"from_attributes": True}


class SavedPatentOut(BaseModel):
    id: int
    patent: PatentDetailOut
    notes: str | None
    created_at: datetime
