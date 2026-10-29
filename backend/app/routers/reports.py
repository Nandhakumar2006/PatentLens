from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.report import Report
from app.models.search import Search, SearchResult
from app.models.user import User
from app.services.reports import generate_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate")
def create_report(search_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    search = db.scalar(
        select(Search)
        .options(selectinload(Search.results).selectinload(SearchResult.patent))
        .where(Search.id == search_id, Search.user_id == user.id)
    )
    if search is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")
    report = generate_report(db, user, search)
    return {"id": report.id, "filename": report.filename, "created_at": report.created_at}


@router.get("")
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.scalar(select(func.count(Report.id)).where(Report.user_id == user.id)) or 0
    rows = db.scalars(
        select(Report)
        .where(Report.user_id == user.id)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {"id": r.id, "filename": r.filename, "search_id": r.search_id, "created_at": r.created_at}
            for r in rows
        ],
    }


@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = db.scalar(select(Report).where(Report.id == report_id, Report.user_id == user.id))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    path = Path(report.filepath)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file missing")
    return FileResponse(path, filename=report.filename, media_type="application/pdf")
