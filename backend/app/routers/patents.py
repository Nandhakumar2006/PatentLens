from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.claim import Claim
from app.models.patent import Patent
from app.models.saved_patent import SavedPatent
from app.models.user import User
from app.schemas.patent import ClaimOut, PatentDetailOut, SavedPatentOut

router = APIRouter(prefix="/api/patents", tags=["patents"])


def _detail(patent: Patent, saved: bool) -> PatentDetailOut:
    return PatentDetailOut.model_validate(patent).model_copy(update={"saved": saved})


@router.get("/saved")
def saved_patents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.scalar(select(func.count(SavedPatent.id)).where(SavedPatent.user_id == user.id)) or 0
    rows = db.scalars(
        select(SavedPatent)
        .options(selectinload(SavedPatent.patent))
        .where(SavedPatent.user_id == user.id)
        .order_by(SavedPatent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        SavedPatentOut(
            id=row.id,
            patent=_detail(row.patent, True),
            notes=row.notes,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{patent_id}", response_model=PatentDetailOut)
def patent_detail(patent_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    patent = db.get(Patent, patent_id)
    if patent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")
    saved = db.scalar(select(SavedPatent).where(SavedPatent.user_id == user.id, SavedPatent.patent_id == patent.id))
    return _detail(patent, saved is not None)


@router.get("/{patent_id}/claims", response_model=list[ClaimOut])
def patent_claims(patent_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    patent = db.get(Patent, patent_id)
    if patent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")
    claims = db.scalars(select(Claim).where(Claim.patent_id == patent.id).order_by(Claim.claim_number)).all()
    return claims


@router.post("/{patent_id}/save")
def save_patent(patent_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    patent = db.get(Patent, patent_id)
    if patent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patent not found")
    existing = db.scalar(select(SavedPatent).where(SavedPatent.user_id == user.id, SavedPatent.patent_id == patent.id))
    if existing:
        return {"message": "Already saved", "saved": True}
    db.add(SavedPatent(user_id=user.id, patent_id=patent.id))
    db.commit()
    return {"message": "Saved", "saved": True}


@router.delete("/{patent_id}/save")
def unsave_patent(patent_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.scalar(select(SavedPatent).where(SavedPatent.user_id == user.id, SavedPatent.patent_id == patent_id))
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved patent not found")
    db.delete(existing)
    db.commit()
    return {"message": "Removed", "saved": False}
