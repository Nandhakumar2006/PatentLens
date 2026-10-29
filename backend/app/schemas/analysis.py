from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    search_id: int | None = None
    patent_ids: list[int] = Field(default_factory=list)
    technical_features: list[str] = Field(min_length=1)
    invention_description: str | None = None


class EvidenceItem(BaseModel):
    patent_id: int
    publication_number: str | None
    title: str | None
    source_type: str
    source_text: str
    similarity: float
    method: str


class FeatureComparison(BaseModel):
    feature: str
    evidence: list[EvidenceItem]
    no_evidence_found: bool
    interpretation: str | None = None
    interpretation_source: str


class CompareResponse(BaseModel):
    comparisons: list[FeatureComparison]
    disclaimer: str
    llm_used: bool


class SummarizeRequest(BaseModel):
    search_id: int
    patent_id: int | None = None


class SummarizeResponse(BaseModel):
    summary: str
    source: str
    grounded_in: list[str]
    llm_used: bool
    disclaimer: str
