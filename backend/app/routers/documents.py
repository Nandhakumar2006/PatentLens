from fastapi import APIRouter, Depends, UploadFile, File

from app.core.security import get_current_user
from app.models.user import User
from app.services.documents import extract_pdf_text
from app.utils.files import save_upload, validate_pdf

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/extract")
def extract(file: UploadFile = File(...), _: User = Depends(get_current_user)):
    validate_pdf(file)
    data = file.file.read()
    path = save_upload(file, data)
    result = extract_pdf_text(path)
    return {
        "filename": path.name,
        "text": result["text"],
        "page_count": result["page_count"],
        "used_ocr": result["used_ocr"],
        "empty": result["empty"],
    }
