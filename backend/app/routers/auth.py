from __future__ import annotations

import math
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.schemas.common import MessageOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9$_-]+$")
BIONAME_PATTERN = re.compile(r"^[a-zA-Z\s]+$")


def _is_predefined_admin(email: str, username: str | None = None) -> bool:
    settings = get_settings()
    admin_list = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    if email.strip().lower() in admin_list or email.strip().lower() == "nandhakumar2006@gmail.com":
        return True
    if username and username.strip() == "Nandha-01":
        return True
    return False


def _serialize_user(user: User) -> dict:
    ref_date = user.bio_name_updated_at or user.created_at
    can_edit = False
    days_left = 0
    editable_at = None
    if ref_date:
        now = datetime.now(timezone.utc)
        ref_utc = ref_date if ref_date.tzinfo else ref_date.replace(tzinfo=timezone.utc)
        editable_at = ref_utc + timedelta(days=14)
        if now >= editable_at:
            can_edit = True
            days_left = 0
        else:
            can_edit = False
            days_left = max(1, math.ceil((editable_at - now).total_seconds() / 86400))
    else:
        can_edit = True

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "bio_name": user.bio_name or user.full_name,
        "full_name": user.full_name or user.bio_name,
        "role": getattr(user, "role", "user"),
        "is_active": getattr(user, "is_active", True),
        "created_at": user.created_at,
        "bio_name_updated_at": user.bio_name_updated_at,
        "can_edit_bio_name": can_edit,
        "days_until_bio_name_edit": days_left,
        "bio_name_editable_at": editable_at,
    }


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    if not USERNAME_PATTERN.match(username):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username can only contain numbers, letters, dollar ($), underscore (_), and hyphen (-).",
        )

    bio_name = (payload.bio_name or payload.full_name or "").strip()
    if not (BIONAME_PATTERN.match(bio_name) and any(c.isalpha() for c in bio_name)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bio name must contain only letters.",
        )

    email_clean = payload.email.lower().strip()
    existing_email = db.scalar(select(User).where(func.lower(User.email) == email_clean))
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    existing_username = db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if existing_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    role = "admin" if _is_predefined_admin(email_clean, username) else "user"
    user = User(
        email=email_clean,
        username=username,
        bio_name=bio_name,
        full_name=bio_name,
        password_hash=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ident = (payload.identifier or payload.username or payload.email or "").strip()
    if not ident:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email is required")

    user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == ident.lower(),
                func.lower(User.username) == ident.lower(),
            )
        )
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")

    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended. Please contact administrator.")

    # Ensure predefined admin always has admin role
    if _is_predefined_admin(user.email, user.username) and user.role != "admin":
        user.role = "admin"
        db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/logout", response_model=MessageOut)
def logout(_: User = Depends(get_current_user)):
    return MessageOut(message="Logged out. Discard the access token on the client.")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _serialize_user(user)


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clean_bio = payload.bio_name.strip()
    if not (BIONAME_PATTERN.match(clean_bio) and any(c.isalpha() for c in clean_bio)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bio name must contain only letters.",
        )

    # 14-day rule: bio_name can only be edited 14 days after creation or last edit
    ref_date = user.bio_name_updated_at or user.created_at
    if ref_date:
        now = datetime.now(timezone.utc)
        ref_utc = ref_date if ref_date.tzinfo else ref_date.replace(tzinfo=timezone.utc)
        editable_at = ref_utc + timedelta(days=14)
        if now < editable_at:
            days_left = max(1, math.ceil((editable_at - now).total_seconds() / 86400))
            date_str = editable_at.strftime("%B %d, %Y")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bio name can only be edited 14 days after creation/last edit. It will be editable on {date_str} (in {days_left} day{'s' if days_left != 1 else ''}).",
            )

    user.bio_name = clean_bio
    user.full_name = clean_bio
    user.bio_name_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)
