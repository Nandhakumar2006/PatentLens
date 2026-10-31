from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64, description="Username containing letters, numbers, $, _, and -")
    bio_name: str = Field(min_length=1, max_length=255, description="Bio name containing only letters")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    identifier: str | None = None
    password: str


class ProfileUpdateRequest(BaseModel):
    bio_name: str = Field(min_length=1, max_length=255, description="Updated bio name containing only letters")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    bio_name: str
    full_name: str
    role: str = "user"
    is_active: bool = True
    created_at: datetime | None = None
    bio_name_updated_at: datetime | None = None
    can_edit_bio_name: bool = False
    days_until_bio_name_edit: int = 0
    bio_name_editable_at: datetime | None = None

    model_config = {"from_attributes": True}
