from __future__ import annotations

import csv
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.chunk import PatentChunk
from app.models.claim import Claim
from app.models.patent import Patent
from app.utils.text import chunk_text, normalize_whitespace, parse_date, split_claims

logger = logging.getLogger(__name__)

EXPECTED_FIELDS = [
    "patent_id",
    "publication_number",
    "title",
    "abstract",
    "claims",
    "description",
    "publication_date",
    "ipc_cpc_codes",
    "inventor",
    "applicant",
    "country",
    "source_url",
]


def clean_row(row: dict) -> dict | None:
    patent_id = normalize_whitespace(row.get("patent_id") or row.get("id"))
    if not patent_id:
        return None
    title = normalize_whitespace(row.get("title"))
    abstract = (row.get("abstract") or "").strip()
    claims = (row.get("claims") or "").strip()
    description = (row.get("description") or "").strip()
    if not any([title, abstract, claims, description]):
        return None
    country = normalize_whitespace(row.get("country")).upper() or None
    source_url = normalize_whitespace(row.get("source_url")) or None
    is_synthetic = True
    marker = f"{patent_id} {row.get('publication_number') or ''} {source_url or ''}".upper()
    if "SYN" in marker or "SYNTHETIC" in marker or "FIXTURE" in marker:
        is_synthetic = True
    elif source_url and source_url.startswith("http"):
        is_synthetic = False
    pub_num = normalize_whitespace(row.get("publication_number")) or None
    ipc_codes = normalize_whitespace(row.get("ipc_cpc_codes")) or None
    inventor = normalize_whitespace(row.get("inventor")) or None
    applicant = normalize_whitespace(row.get("applicant")) or None

    return {
        "patent_id": patent_id[:64],
        "publication_number": pub_num[:64] if pub_num else None,
        "title": title[:1000] if title else None,
        "abstract": abstract or None,
        "claims_text": claims or None,
        "description": description or None,
        "publication_date": parse_date(row.get("publication_date")),
        "ipc_cpc_codes": ipc_codes[:500] if ipc_codes else None,
        "inventor": inventor[:500] if inventor else None,
        "applicant": applicant[:500] if applicant else None,
        "country": country[:16] if country else None,
        "source_url": source_url[:1000] if source_url else None,
        "is_synthetic": is_synthetic,
    }


def build_chunks(patent_fields: dict) -> list[dict]:
    settings = get_settings()
    pieces: list[tuple[str, str]] = []
    header = " ".join(filter(None, [patent_fields.get("title"), patent_fields.get("abstract")]))
    if header.strip():
        pieces.extend(chunk_text(header, settings.CHUNK_SIZE_CHARS, settings.CHUNK_OVERLAP_CHARS, "title_abstract"))
    for _num, claim in split_claims(patent_fields.get("claims_text")):
        pieces.extend(chunk_text(claim, settings.CHUNK_SIZE_CHARS, settings.CHUNK_OVERLAP_CHARS, "claim"))
    if patent_fields.get("description"):
        pieces.extend(
            chunk_text(
                patent_fields["description"],
                settings.CHUNK_SIZE_CHARS,
                settings.CHUNK_OVERLAP_CHARS,
                "description",
            )
        )
    return [{"chunk_index": i, "chunk_type": t, "text": txt} for i, (t, txt) in enumerate(pieces)]


def import_csv(db: Session, csv_path: str | Path, batch_size: int = 200) -> dict:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    created = 0
    updated = 0
    skipped = 0
    pending: list[dict] = []

    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            cleaned = clean_row(raw)
            if cleaned is None:
                skipped += 1
                continue
            pending.append(cleaned)
            if len(pending) >= batch_size:
                c, u = _flush_batch(db, pending)
                created += c
                updated += u
                pending = []
        if pending:
            c, u = _flush_batch(db, pending)
            created += c
            updated += u

    db.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "path": str(path)}


def _flush_batch(db: Session, rows: list[dict]) -> tuple[int, int]:
    ids = [r["patent_id"] for r in rows]
    existing = {
        p.patent_id: p
        for p in db.scalars(select(Patent).where(Patent.patent_id.in_(ids))).all()
    }
    created = 0
    updated = 0
    for row in rows:
        patent = existing.get(row["patent_id"])
        if patent is None:
            patent = Patent(**row)
            db.add(patent)
            db.flush()
            created += 1
        else:
            for key, value in row.items():
                setattr(patent, key, value)
            patent.claims.clear()
            patent.chunks.clear()
            db.flush()
            updated += 1
        for number, text in split_claims(row.get("claims_text")):
            db.add(Claim(patent_id=patent.id, claim_number=number, claim_text=text))
        for chunk in build_chunks(row):
            db.add(PatentChunk(patent_id=patent.id, **chunk, vector_id=None))
    db.flush()
    return created, updated
