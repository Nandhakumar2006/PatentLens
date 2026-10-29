from __future__ import annotations

import json
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.chunk import PatentChunk
from app.models.patent import Patent
from app.models.search import Search, SearchResult
from app.models.user import User
from app.services.embeddings import get_embedding_service
from app.services.vector_index import get_vector_index

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Semantic similarity identifies potentially related prior-art text. "
    "It is not a legal determination of novelty, patentability, infringement, or rejection probability."
)


def _patent_passes_filters(
    patent: Patent,
    country: str | None,
    classification: str | None,
    date_from: date | None,
    date_to: date | None,
) -> bool:
    if country and (patent.country or "").upper() != country.upper():
        return False
    if classification:
        codes = (patent.ipc_cpc_codes or "").upper()
        if classification.upper() not in codes:
            return False
    if date_from and patent.publication_date and patent.publication_date < date_from:
        return False
    if date_to and patent.publication_date and patent.publication_date > date_to:
        return False
    return True


def run_semantic_search(
    db: Session,
    user: User,
    title: str | None,
    description: str | None = "",
    technical_features: list[str] | None = None,
    top_k: int = 10,
    country: str | None = None,
    classification: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Search:
    settings = get_settings()
    index = get_vector_index()
    if not index.loaded:
        raise RuntimeError("Semantic index is not loaded. Build embeddings and the FAISS index first.")

    embedder = get_embedding_service()
    desc = description or ""
    features = technical_features or []
    query_parts = [title or "", desc, " ".join(features)]
    query_text = " ".join(p for p in query_parts if p).strip()
    if not query_text:
        query_text = title or "invention"
    query_vec = embedder.encode_query(query_text)

    candidate_k = min(max(settings.SEARCH_CANDIDATE_CHUNKS, top_k * 8), max(index.ntotal, 1))
    hits = index.search(query_vec, candidate_k)

    chunk_ids = []
    score_by_vector = {}
    for vector_id, score in hits:
        if vector_id >= len(index.mapping):
            continue
        mapping = index.mapping[vector_id]
        chunk_ids.append(mapping["chunk_id"])
        score_by_vector[mapping["chunk_id"]] = score

    chunks = db.scalars(select(PatentChunk).where(PatentChunk.id.in_(chunk_ids))).all() if chunk_ids else []
    chunks_by_id = {c.id: c for c in chunks}

    patent_buckets: dict[int, dict] = {}
    for vector_id, score in hits:
        if vector_id >= len(index.mapping):
            continue
        mapping = index.mapping[vector_id]
        chunk = chunks_by_id.get(mapping["chunk_id"])
        if chunk is None:
            continue
        bucket = patent_buckets.setdefault(
            chunk.patent_id,
            {"score": -1.0, "excerpts": []},
        )
        bucket["score"] = max(bucket["score"], float(score))
        if len(bucket["excerpts"]) < 3:
            bucket["excerpts"].append(
                {
                    "chunk_type": chunk.chunk_type,
                    "text": chunk.text[:800],
                    "score": round(float(score), 4),
                }
            )

    patents = db.scalars(select(Patent).where(Patent.id.in_(list(patent_buckets.keys())))).all() if patent_buckets else []
    patents_by_id = {p.id: p for p in patents}

    ranked = []
    for patent_id, bucket in patent_buckets.items():
        patent = patents_by_id.get(patent_id)
        if patent is None:
            continue
        if not _patent_passes_filters(patent, country, classification, date_from, date_to):
            continue
        ranked.append((patent, bucket))
    ranked.sort(key=lambda item: item[1]["score"], reverse=True)
    ranked = ranked[:top_k]

    search = Search(
        user_id=user.id,
        title=title,
        description=desc,
        technical_features=json.dumps(features),
        model_name=index.meta.get("model_name") or embedder.model_name,
        filters_json=json.dumps(
            {
                "country": country,
                "classification": classification,
                "date_from": str(date_from) if date_from else None,
                "date_to": str(date_to) if date_to else None,
                "top_k": top_k,
            }
        ),
    )
    db.add(search)
    db.flush()
    for rank, (patent, bucket) in enumerate(ranked, start=1):
        db.add(
            SearchResult(
                search_id=search.id,
                patent_id=patent.id,
                similarity_score=float(bucket["score"]),
                rank=rank,
                excerpts_json=json.dumps(bucket["excerpts"]),
            )
        )
    db.commit()
    db.refresh(search)
    return search


def serialize_search(search: Search) -> dict:
    results = []
    ordered = sorted(search.results, key=lambda r: r.rank)
    for item in ordered:
        patent = item.patent
        results.append(
            {
                "id": patent.id,
                "patent_id": patent.patent_id,
                "publication_number": patent.publication_number,
                "title": patent.title,
                "abstract": patent.abstract,
                "publication_date": patent.publication_date,
                "inventor": patent.inventor,
                "applicant": patent.applicant,
                "country": patent.country,
                "ipc_cpc_codes": patent.ipc_cpc_codes,
                "source_url": patent.source_url,
                "is_synthetic": patent.is_synthetic,
                "similarity_score": round(item.similarity_score, 4),
                "excerpts": json.loads(item.excerpts_json or "[]"),
            }
        )
    index = get_vector_index()
    try:
        features = json.loads(search.technical_features or "[]")
    except json.JSONDecodeError:
        features = []
    return {
        "search_id": search.id,
        "title": search.title,
        "description": search.description,
        "technical_features": features,
        "model_name": search.model_name,
        "embedding_backend": index.meta.get("embedding_backend") or get_embedding_service().backend,
        "result_count": len(results),
        "results": results,
        "disclaimer": DISCLAIMER,
    }
