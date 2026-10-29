from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.utils.text import safe_filename

ALLOWED_PDF_TYPES = {"application/pdf", "application/x-pdf"}


def validate_pdf(upload: UploadFile) -> None:
    filename = upload.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")
    content_type = (upload.content_type or "").lower()
    if content_type and content_type not in ALLOWED_PDF_TYPES and content_type != "application/octet-stream":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PDF content type")


def save_upload(upload: UploadFile, data: bytes) -> Path:
    settings = get_settings()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit",
        )
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is not a valid PDF")
    dest_dir = Path(settings.UPLOAD_DIR)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / safe_filename(upload.filename or "upload.pdf")
    if path.exists():
        path = dest_dir / f"{path.stem}_{len(data)}{path.suffix}"
    path.write_bytes(data)
    return path
