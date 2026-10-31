from __future__ import annotations

import csv
import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import get_current_admin
from app.db.session import database_status, get_db
from app.models.chunk import PatentChunk
from app.models.claim import Claim
from app.models.ingestion_history import IngestionHistory
from app.models.patent import Patent
from app.models.report import Report
from app.models.saved_patent import SavedPatent
from app.models.search import Search
from app.models.user import User
from app.schemas.admin import (
    AdminOverviewOut,
    AdminSecretConfirmRequest,
    CsvValidationOut,
    GlobalSearchItem,
    IndexRebuildOut,
    IngestionHistoryItemOut,
    IngestionHistoryListOut,
    IngestionResultOut,
    PatentManagementOut,
    RoleUpdateRequest,
    SinglePatentCreateRequest,
    StatusUpdateRequest,
    UserManagementOut,
)
from app.services.ingestion import build_chunks, clean_row, split_claims
from app.services.vector_index import get_vector_index, rebuild_index_from_database

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

MANDATORY_CSV_COLUMNS = [
    "patent_id",
    "title",
    "abstract",
    "claims",
    "description",
    "inventor",
    "country",
]

CSV_TEMPLATE_COLUMNS = [
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

REQUIRED_CSV_COLUMNS = MANDATORY_CSV_COLUMNS

PREDEFINED_PRIMARY_ADMIN = "nandhakumar2006@gmail.com"


def check_admin_secret(secret_password: Optional[str] = None, header_secret: Optional[str] = None):
    settings = get_settings()
    candidate = (secret_password or header_secret or "").strip()
    if not candidate or candidate != settings.ADMIN_ACTION_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid secret authorization password. Action prohibited.",
        )


@router.get("/overview", response_model=AdminOverviewOut)
def admin_overview(db: Session = Depends(get_db)):
    users_count = db.scalar(select(func.count(User.id))) or 0
    patents_count = db.scalar(select(func.count(Patent.id))) or 0
    claims_count = db.scalar(select(func.count(Claim.id))) or 0
    chunks_count = db.scalar(select(func.count(PatentChunk.id))) or 0
    searches_count = db.scalar(select(func.count(Search.id))) or 0
    reports_count = db.scalar(select(func.count(Report.id))) or 0

    index = get_vector_index()
    index_status = index.status()
    db_status = database_status()

    # Recent 10 platform-wide searches
    recent_query = (
        select(Search)
        .options(selectinload(Search.user), selectinload(Search.results))
        .order_by(desc(Search.created_at))
        .limit(10)
    )
    searches = db.scalars(recent_query).all()

    recent_items = [
        GlobalSearchItem(
            id=s.id,
            user_email=s.user.email if s.user else "Anonymous",
            user_name=s.user.full_name if s.user else "Anonymous",
            query_title=s.title or "Untitled Search",
            results_count=len(s.results),
            created_at=s.created_at,
        )
        for s in searches
    ]

    return AdminOverviewOut(
        stats={
            "total_users": users_count,
            "total_patents": patents_count,
            "total_claims": claims_count,
            "total_chunks": chunks_count,
            "total_searches": searches_count,
            "total_reports": reports_count,
        },
        health={
            "database_ok": db_status.get("ok", False),
            "database_type": db_status.get("url_scheme", "unknown"),
            "is_sqlite": db_status.get("is_sqlite", False),
            "faiss_loaded": index_status.get("ok", False),
            "faiss_vectors": index_status.get("vector_count", 0),
            "faiss_dimension": index_status.get("dimension", 384),
            "embedding_model": index_status.get("model_name", "BAAI/bge-small-en-v1.5"),
            "acceleration": index_status.get("acceleration", "CPU (Fallback)"),
            "device_name": index_status.get("device_name", "CPU"),
            "cuda_available": index_status.get("hardware", {}).get("cuda_available", False),
        },
        recent_searches=recent_items,
    )


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(User.id))) or 0
    users = db.scalars(
        select(User)
        .order_by(desc(User.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for u in users:
        sc = db.scalar(select(func.count(Search.id)).where(Search.user_id == u.id)) or 0
        items.append(
            UserManagementOut(
                id=u.id,
                email=u.email,
                username=getattr(u, "username", None),
                bio_name=getattr(u, "bio_name", None),
                full_name=u.full_name,
                role=getattr(u, "role", "user"),
                is_active=getattr(u, "is_active", True),
                created_at=u.created_at,
                searches_count=sc,
            )
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    check_admin_secret(payload.secret_password, x_admin_secret)
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.email.lower() == PREDEFINED_PRIMARY_ADMIN and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote the primary predefined administrator")
    if target.id == admin.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote your own administrator account")
    target.role = payload.role
    db.commit()
    return {"id": target.id, "email": target.email, "role": target.role}


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: StatusUpdateRequest,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    check_admin_secret(payload.secret_password, x_admin_secret)
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.email.lower() == PREDEFINED_PRIMARY_ADMIN and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate the primary predefined administrator")
    if target.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot suspend your own administrator account")
    target.is_active = payload.is_active
    db.commit()
    return {"id": target.id, "email": target.email, "is_active": target.is_active}


@router.delete("/users/{user_id}")
@router.post("/users/{user_id}/delete")
def delete_user(
    user_id: int,
    payload: Optional[AdminSecretConfirmRequest] = None,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    check_admin_secret(payload.secret_password if payload else None, x_admin_secret)

    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.email.lower() == PREDEFINED_PRIMARY_ADMIN.lower():
        raise HTTPException(status_code=400, detail="Cannot delete the primary predefined administrator")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")
    if target.role == "admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an administrator account directly. The user must first be demoted to a regular user.",
        )

    # Cascade user records
    db.query(SavedPatent).filter(SavedPatent.user_id == target.id).delete()
    searches = db.scalars(select(Search).where(Search.user_id == target.id)).all()
    for s in searches:
        db.delete(s)
    db.query(Report).filter(Report.user_id == target.id).delete()

    # Nullify user_id on ingestion history to retain audit logs
    db.query(IngestionHistory).filter(IngestionHistory.user_id == target.id).update({"user_id": None})

    user_label = f"@{target.username}" if getattr(target, "username", None) else target.email
    db.delete(target)
    db.commit()
    return {"message": f"User {user_label} successfully removed", "id": user_id}


@router.get("/patents")
def list_patents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = select(Patent)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where((Patent.patent_id.ilike(term)) | (Patent.title.ilike(term)))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    patents = db.scalars(
        query.order_by(desc(Patent.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for p in patents:
        claims_count = db.scalar(select(func.count(Claim.id)).where(Claim.patent_id == p.id)) or 0
        chunks_count = db.scalar(select(func.count(PatentChunk.id)).where(PatentChunk.patent_id == p.id)) or 0
        items.append(
            PatentManagementOut(
                id=p.id,
                patent_id=p.patent_id,
                title=p.title,
                country=p.country,
                publication_date=str(p.publication_date) if p.publication_date else None,
                claims_count=claims_count,
                chunks_count=chunks_count,
            )
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.delete("/patents/{patent_id}")
def delete_patent(patent_id: int, db: Session = Depends(get_db)):
    patent = db.get(Patent, patent_id)
    if not patent:
        raise HTTPException(status_code=404, detail="Patent not found")
    
    # Cascade delete saved_patents, chunks, claims
    db.query(SavedPatent).filter(SavedPatent.patent_id == patent.id).delete()
    db.query(PatentChunk).filter(PatentChunk.patent_id == patent.id).delete()
    db.query(Claim).filter(Claim.patent_id == patent.id).delete()
    db.delete(patent)
    db.commit()
    return {"message": f"Patent '{patent.patent_id}' successfully removed"}


@router.post("/patents/single")
def create_single_patent(
    payload: SinglePatentCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = db.scalar(select(Patent).where(Patent.patent_id == payload.patent_id.strip()))
    if existing:
        raise HTTPException(status_code=409, detail=f"Patent ID '{payload.patent_id}' already exists")

    cleaned_dict = clean_row({
        "patent_id": payload.patent_id.strip(),
        "title": payload.title.strip(),
        "abstract": payload.abstract or "",
        "claims": payload.claims or "",
        "description": payload.description or "",
        "inventor": payload.inventor or "",
        "country": payload.country or "US",
        "publication_date": payload.publication_date or "",
        "publication_number": payload.publication_number or "",
        "source_url": payload.source_url or "",
    })

    if not cleaned_dict:
        raise HTTPException(status_code=422, detail="Invalid patent data")

    patent = Patent(**cleaned_dict)
    db.add(patent)
    db.flush()

    for number, text in split_claims(cleaned_dict.get("claims_text")):
        db.add(Claim(patent_id=patent.id, claim_number=number, claim_text=text))

    for chunk in build_chunks(cleaned_dict):
        db.add(PatentChunk(patent_id=patent.id, **chunk, vector_id=None))

    # Log ingestion history for single patent
    single_details = {
        "patent_id": patent.patent_id,
        "title": patent.title,
        "abstract": patent.abstract,
        "claims": payload.claims or "",
        "description": patent.description,
        "inventor": patent.inventor,
        "country": patent.country,
        "publication_date": str(patent.publication_date) if patent.publication_date else None,
        "publication_number": patent.publication_number,
        "source_url": patent.source_url,
    }
    history_entry = IngestionHistory(
        user_id=admin.id,
        ingestion_type="single",
        status="completed",
        summary=f"Single Patent: {patent.patent_id} — {patent.title}",
        details_json=json.dumps(single_details),
        file_path=None,
    )
    db.add(history_entry)

    db.commit()
    db.refresh(patent)
    return {"id": patent.id, "patent_id": patent.patent_id, "message": "Patent created successfully"}


@router.get("/ingest/template")
def download_csv_template():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_TEMPLATE_COLUMNS)
    writer.writerow([
        "US-2024-0012345-A1",
        "US11223344B2",
        "High-Efficiency Perovskite Solar Cell with Graphene Interlayer",
        "A multi-junction photovoltaic device comprising a perovskite active layer and an atomically thin graphene transport layer providing enhanced power conversion efficiency.",
        "1. A solar cell comprising a substrate, an electron transport layer, and a perovskite photoactive layer. 2. The solar cell of claim 1, further comprising a graphene interlayer.",
        "The present invention relates to solar energy conversion technologies, specifically perovskite-based photovoltaic architectures with improved carrier mobility.",
        "2024-04-10",
        "H02S10/00; H01L31/04",
        "Dr. Alice Vance, Dr. Gordon Freeman",
        "Apex Energy Innovations LLC",
        "US",
        "https://patents.google.com/patent/US20240012345A1",
    ])
    writer.writerow([
        "EP-3987654-B1",
        "EP3987654B1",
        "Autonomous Battery Thermal Management System for Electric Vehicles",
        "An active cooling and heating circuit for automotive battery packs using phase-change materials and predictive temperature modeling.",
        "1. An energy storage system comprising a battery module, a thermal sensor array, and a microcontroller configured to modulate refrigerant flow.",
        "Electric vehicle performance is highly dependent on operating within optimal cell temperature bands. This invention provides adaptive cooling under peak load.",
        "2023-11-22",
        "B60L58/26; H01M10/613",
        "Elena Rostova",
        "Nordic Battery Technologies AB",
        "EP",
        "https://patents.google.com/patent/EP3987654B1",
    ])
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=patentlens_standard_template.csv"},
    )


@router.post("/ingest/validate-csv", response_model=CsvValidationOut)
async def validate_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        return CsvValidationOut(
            is_valid=False,
            expected_columns=REQUIRED_CSV_COLUMNS,
            detected_columns=[],
            missing_columns=REQUIRED_CSV_COLUMNS,
            total_rows=0,
            preview=[],
            message="CSV file is empty or has no header row",
        )

    raw_headers = [h.strip() for h in reader.fieldnames if h]
    normalized_detected = [h.strip().lower() for h in raw_headers]

    missing = [col for col in REQUIRED_CSV_COLUMNS if col not in normalized_detected]
    is_valid = len(missing) == 0

    preview_rows = []
    total_rows = 0
    for idx, row in enumerate(reader):
        total_rows += 1
        if idx < 3:
            cleaned_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            preview_rows.append(cleaned_row)

    if not is_valid:
        msg = f"Structure validation failed: Missing required column(s): {', '.join(missing)}. Please follow the standard format."
    else:
        msg = f"Structure successfully verified! All {len(REQUIRED_CSV_COLUMNS)} required columns matched. {total_rows} rows ready for ingestion."

    return CsvValidationOut(
        is_valid=is_valid,
        expected_columns=REQUIRED_CSV_COLUMNS,
        detected_columns=normalized_detected,
        missing_columns=missing,
        total_rows=total_rows,
        preview=preview_rows,
        message=msg,
    )


@router.post("/ingest/process-csv", response_model=IngestionResultOut)
async def process_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Empty CSV file")

    normalized_headers = [h.strip().lower() for h in reader.fieldnames if h]
    missing = [col for col in REQUIRED_CSV_COLUMNS if col not in normalized_headers]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV does not match required structure. Missing: {', '.join(missing)}",
        )

    # Persist the uploaded CSV file so it can be viewed and downloaded later
    settings = get_settings()
    ingestions_dir = Path(settings.UPLOAD_DIR).parent / "ingestions"
    ingestions_dir.mkdir(parents=True, exist_ok=True)
    timestamp_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    saved_filepath = ingestions_dir / f"{timestamp_prefix}_{clean_filename}"
    saved_filepath.write_bytes(content)

    created = 0
    updated = 0
    skipped = 0
    pending_batch = []
    preview_sample = []

    for idx, row in enumerate(reader):
        normalized_row = {k.strip().lower(): v for k, v in row.items() if k}
        if idx < 10:
            preview_sample.append(normalized_row)

        if not all((normalized_row.get(col) or "").strip() for col in MANDATORY_CSV_COLUMNS):
            skipped += 1
            continue
        cleaned = clean_row(normalized_row)
        if cleaned is None:
            skipped += 1
            continue
        pending_batch.append(cleaned)
        if len(pending_batch) >= 100:
            c, u = _flush_admin_batch(db, pending_batch)
            created += c
            updated += u
            pending_batch = []

    if pending_batch:
        c, u = _flush_admin_batch(db, pending_batch)
        created += c
        updated += u

    # Record IngestionHistory
    bulk_details = {
        "filename": file.filename,
        "filesize": len(content),
        "total_processed": created + updated,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "preview": preview_sample,
    }
    history_entry = IngestionHistory(
        user_id=admin.id,
        ingestion_type="bulk",
        status="completed",
        summary=f"Bulk CSV: {file.filename} ({created} created, {updated} updated, {skipped} skipped)",
        details_json=json.dumps(bulk_details),
        file_path=str(saved_filepath),
    )
    db.add(history_entry)
    db.commit()

    return IngestionResultOut(
        created=created,
        updated=updated,
        skipped=skipped,
        message=f"Ingestion complete: {created} new patents created, {updated} updated, {skipped} skipped.",
    )


def _flush_admin_batch(db: Session, rows: list[dict]) -> tuple[int, int]:
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
            existing[row["patent_id"]] = patent
        else:
            for key, value in row.items():
                setattr(patent, key, value)
            db.query(Claim).filter(Claim.patent_id == patent.id).delete()
            db.query(PatentChunk).filter(PatentChunk.patent_id == patent.id).delete()
            db.flush()
            updated += 1

        seen_claims: set[int] = set()
        for number, text in split_claims(row.get("claims_text")):
            c_num = number
            while c_num in seen_claims:
                c_num += 1
            seen_claims.add(c_num)
            db.add(Claim(patent_id=patent.id, claim_number=c_num, claim_text=text))

        for chunk in build_chunks(row):
            db.add(PatentChunk(patent_id=patent.id, **chunk, vector_id=None))

    db.flush()
    return created, updated


@router.post("/index/rebuild", response_model=IndexRebuildOut)
def trigger_index_rebuild(db: Session = Depends(get_db)):
    result = rebuild_index_from_database(db)
    return IndexRebuildOut(**result)


@router.get("/ingest/history", response_model=IngestionHistoryListOut)
def list_ingestion_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(IngestionHistory.id))) or 0
    records = db.scalars(
        select(IngestionHistory)
        .options(selectinload(IngestionHistory.user))
        .order_by(desc(IngestionHistory.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for r in records:
        details_obj = None
        if r.details_json:
            try:
                details_obj = json.loads(r.details_json)
            except Exception:
                details_obj = {"raw": r.details_json}

        has_file = bool(r.file_path and Path(r.file_path).exists())
        fname = details_obj.get("filename") if isinstance(details_obj, dict) else None

        items.append(
            IngestionHistoryItemOut(
                id=r.id,
                user_id=r.user_id,
                user_name=r.user.bio_name if r.user and getattr(r.user, "bio_name", None) else (r.user.full_name if r.user else "System"),
                username=getattr(r.user, "username", None) if r.user else None,
                user_email=r.user.email if r.user else "system@patentlens.ai",
                ingestion_type=r.ingestion_type,
                status=r.status,
                summary=r.summary,
                details=details_obj,
                has_file=has_file,
                filename=fname,
                created_at=r.created_at,
            )
        )

    return IngestionHistoryListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/ingest/history/{history_id}/download")
def download_ingested_file(history_id: int, db: Session = Depends(get_db)):
    rec = db.get(IngestionHistory, history_id)
    if not rec or not rec.file_path:
        raise HTTPException(status_code=404, detail="Ingestion record or file not found")

    path = Path(rec.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File no longer exists on disk")

    details_obj = {}
    if rec.details_json:
        try:
            details_obj = json.loads(rec.details_json)
        except Exception:
            pass

    orig_name = details_obj.get("filename") or path.name
    return FileResponse(
        path=str(path),
        media_type="text/csv",
        filename=orig_name,
        headers={"Content-Disposition": f'attachment; filename="{orig_name}"'},
    )


@router.get("/ingest/history/{history_id}/content")
def view_ingested_file_content(history_id: int, db: Session = Depends(get_db)):
    rec = db.get(IngestionHistory, history_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Ingestion record not found")

    details_obj = {}
    if rec.details_json:
        try:
            details_obj = json.loads(rec.details_json)
        except Exception:
            pass

    if rec.ingestion_type == "single":
        return {
            "type": "single",
            "summary": rec.summary,
            "details": details_obj,
        }

    if not rec.file_path or not Path(rec.file_path).exists():
        return {
            "type": "bulk",
            "summary": rec.summary,
            "details": details_obj,
            "headers": [],
            "rows": details_obj.get("preview", []),
            "total_rows_preview": len(details_obj.get("preview", [])),
            "file_missing": True,
        }

    try:
        content_bytes = Path(rec.file_path).read_bytes()
        try:
            text_str = content_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            text_str = content_bytes.decode("latin-1")

        reader = csv.DictReader(io.StringIO(text_str))
        headers = reader.fieldnames or []
        rows = []
        for i, row in enumerate(reader):
            if i >= 100:
                break
            rows.append(row)

        return {
            "type": "bulk",
            "summary": rec.summary,
            "filename": details_obj.get("filename", Path(rec.file_path).name),
            "filesize": len(content_bytes),
            "headers": headers,
            "rows": rows,
            "total_rows_preview": len(rows),
            "created": details_obj.get("created", 0),
            "updated": details_obj.get("updated", 0),
            "skipped": details_obj.get("skipped", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV file: {str(e)}")


@router.delete("/ingest/history/{history_id}")
@router.post("/ingest/history/{history_id}/delete")
def delete_ingestion_history_item(
    history_id: int,
    payload: Optional[AdminSecretConfirmRequest] = None,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    check_admin_secret(payload.secret_password if payload else None, x_admin_secret)

    rec = db.get(IngestionHistory, history_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Ingestion record not found")

    # Delete physical file on disk if bulk CSV
    if rec.file_path:
        try:
            p = Path(rec.file_path)
            if p.exists() and p.is_file():
                p.unlink(missing_ok=True)
        except Exception:
            pass

    db.delete(rec)
    db.commit()
    return {"message": f"Ingestion record #{history_id} successfully deleted", "id": history_id}


@router.post("/ingest/history/clear")
@router.delete("/ingest/history")
def clear_all_ingestion_history(
    payload: Optional[AdminSecretConfirmRequest] = None,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    check_admin_secret(payload.secret_password if payload else None, x_admin_secret)

    records = db.scalars(select(IngestionHistory)).all()
    count = len(records)
    for r in records:
        if r.file_path:
            try:
                p = Path(r.file_path)
                if p.exists() and p.is_file():
                    p.unlink(missing_ok=True)
            except Exception:
                pass
        db.delete(r)

    db.commit()
    return {
        "message": f"Successfully cleared all {count} ingestion history records and files",
        "deleted_count": count,
    }


@router.get("/analytics/searches")
def global_search_analytics(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(Search.id))) or 0
    searches = db.scalars(
        select(Search)
        .options(selectinload(Search.user), selectinload(Search.results))
        .order_by(desc(Search.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = [
        GlobalSearchItem(
            id=s.id,
            user_email=s.user.email if s.user else "Anonymous",
            user_name=s.user.full_name if s.user else "Anonymous",
            query_title=s.title or "Untitled Search",
            results_count=len(s.results),
            created_at=s.created_at,
        )
        for s in searches
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}
