from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.schemas.common import MessageOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _is_predefined_admin(email: str) -> bool:
    settings = get_settings()
    admin_list = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    return email.strip().lower() in admin_list or email.strip().lower() == "nandhakumar2006@gmail.com"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email_clean))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    
    role = "admin" if _is_predefined_admin(email_clean) else "user"
    user = User(
        email=email_clean,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email_clean))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended. Please contact administrator.")

    # Ensure predefined admin always has admin role
    if _is_predefined_admin(email_clean) and user.role != "admin":
        user.role = "admin"
        db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/logout", response_model=MessageOut)
def logout(_: User = Depends(get_current_user)):
    return MessageOut(message="Logged out. Discard the access token on the client.")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
