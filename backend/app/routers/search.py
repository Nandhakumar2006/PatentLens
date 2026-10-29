from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.search import Search, SearchResult
from app.models.user import User
from app.schemas.search import SearchHistoryItem, SearchRequest, SearchResponse
from app.services.search_engine import run_semantic_search, serialize_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def create_search(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        search = run_semantic_search(
            db,
            user,
            title=payload.title,
            description=payload.description or '',
            technical_features=payload.technical_features,
            top_k=payload.top_k,
            country=payload.country,
            classification=payload.classification,
            date_from=payload.date_from,
            date_to=payload.date_to,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    search = db.scalar(
        select(Search).options(selectinload(Search.results).selectinload(SearchResult.patent)).where(Search.id == search.id)
    )
    return serialize_search(search)


@router.get("/history")
def history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.scalar(select(func.count(Search.id)).where(Search.user_id == user.id)) or 0
    rows = db.scalars(
        select(Search)
        .where(Search.user_id == user.id)
        .order_by(Search.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = []
    for row in rows:
        count = db.scalar(select(func.count(SearchResult.id)).where(SearchResult.search_id == row.id)) or 0
        items.append(
            SearchHistoryItem(
                id=row.id,
                title=row.title,
                description=row.description,
                model_name=row.model_name,
                created_at=row.created_at,
                result_count=count,
            )
        )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/history/{search_id}", response_model=SearchResponse)
def history_detail(search_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    search = db.scalar(
        select(Search)
        .options(selectinload(Search.results).selectinload(SearchResult.patent))
        .where(Search.id == search_id, Search.user_id == user.id)
    )
    if search is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")
    return serialize_search(search)


@router.delete("/history/{search_id}")
def delete_history(search_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    search = db.scalar(select(Search).where(Search.id == search_id, Search.user_id == user.id))
    if search is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")
    db.delete(search)
    db.commit()
    return {"message": "Search deleted"}


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models.report import Report
    from app.models.saved_patent import SavedPatent

    return {
        "searches": db.scalar(select(func.count(Search.id)).where(Search.user_id == user.id)) or 0,
        "saved_patents": db.scalar(select(func.count(SavedPatent.id)).where(SavedPatent.user_id == user.id)) or 0,
        "reports": db.scalar(select(func.count(Report.id)).where(Report.user_id == user.id)) or 0,
        "index": __import__("app.services.vector_index", fromlist=["get_vector_index"]).get_vector_index().status(),
    }
