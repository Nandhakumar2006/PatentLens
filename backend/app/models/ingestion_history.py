from __future__ import annotations

from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class IngestionHistory(Base):
    __tablename__ = "ingestion_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    ingestion_type: Mapped[str] = mapped_column(String(32), nullable=False)  # "single" or "bulk"
    status: Mapped[str] = mapped_column(String(32), default="completed", nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    details_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")
