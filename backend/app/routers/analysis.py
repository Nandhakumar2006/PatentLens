from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analysis import CompareRequest, CompareResponse, SummarizeRequest, SummarizeResponse
from app.services.analysis import compare_features, summarize_search

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/compare", response_model=CompareResponse)
def compare(payload: CompareRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return compare_features(
            db,
            user.id,
            payload.search_id,
            payload.patent_ids,
            payload.technical_features,
            payload.invention_description,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/summarize", response_model=SummarizeResponse)
def summarize(payload: SummarizeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return summarize_search(db, user.id, payload.search_id, payload.patent_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
