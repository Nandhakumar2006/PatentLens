from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_pdf_text(path: str | Path) -> dict:
    import fitz

    doc = fitz.open(path)
    pages = []
    for page in doc:
        pages.append(page.get_text("text") or "")
    text = "\n".join(pages).strip()
    used_ocr = False
    if len(text) < 40:
        ocr_text = _ocr_pdf(path)
        if ocr_text:
            text = ocr_text
            used_ocr = True
    return {
        "text": text,
        "page_count": doc.page_count,
        "used_ocr": used_ocr,
        "empty": len(text.strip()) == 0,
    }


def _ocr_pdf(path: str | Path) -> str:
    try:
        import fitz
        import pytesseract
        from PIL import Image
        import io
    except Exception as exc:
        logger.warning("OCR dependencies unavailable: %s", exc)
        return ""
    try:
        doc = fitz.open(path)
        parts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            image = Image.open(io.BytesIO(pix.tobytes("png")))
            parts.append(pytesseract.image_to_string(image) or "")
        return "\n".join(parts).strip()
    except Exception as exc:
        logger.warning("OCR failed: %s", exc)
        return ""
