from fastapi import APIRouter

from app.core.config import get_settings
from app.db.session import database_status
from app.services.vector_index import get_vector_index

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health():
    return {"ok": True, "service": "patentlens"}


@router.get("/database")
def health_database():
    return database_status()


@router.get("/index")
def health_index():
    return get_vector_index().status()


@router.get("/config")
def health_config():
    settings = get_settings()
    return {
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "embedding_backend": settings.EMBEDDING_BACKEND,
        "llm_configured": bool(settings.LLM_API_KEY and settings.LLM_PROVIDER),
        "frontend_origin": settings.FRONTEND_ORIGIN,
    }
