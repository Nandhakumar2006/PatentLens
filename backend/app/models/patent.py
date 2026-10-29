from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Patent(Base):
    __tablename__ = "patents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patent_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    publication_number: Mapped[str | None] = mapped_column(String(64), index=True)
    title: Mapped[str | None] = mapped_column(String(1000))
    abstract: Mapped[str | None] = mapped_column(Text)
    claims_text: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    publication_date: Mapped[date | None] = mapped_column(Date, index=True)
    ipc_cpc_codes: Mapped[str | None] = mapped_column(String(500), index=True)
    inventor: Mapped[str | None] = mapped_column(String(500))
    applicant: Mapped[str | None] = mapped_column(String(500))
    country: Mapped[str | None] = mapped_column(String(16), index=True)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    claims = relationship("Claim", back_populates="patent", cascade="all, delete-orphan")
    chunks = relationship("PatentChunk", back_populates="patent", cascade="all, delete-orphan")
