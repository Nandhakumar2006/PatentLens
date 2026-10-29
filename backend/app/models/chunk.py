from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PatentChunk(Base):
    __tablename__ = "patent_chunks"
    __table_args__ = (UniqueConstraint("patent_id", "chunk_index", name="uq_patent_chunk_index"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patent_id: Mapped[int] = mapped_column(ForeignKey("patents.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(32), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    vector_id: Mapped[int | None] = mapped_column(Integer, index=True)

    patent = relationship("Patent", back_populates="chunks")
