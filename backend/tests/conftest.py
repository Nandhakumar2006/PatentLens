from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
os.environ["DATABASE_URL"] = "sqlite:///" + str((BACKEND / "tests" / "test.db").as_posix())
os.environ["EMBEDDING_BACKEND"] = "hash"
os.environ["EMBEDDING_MODEL_NAME"] = "hash-384"
os.environ["SECRET_KEY"] = "unit-test-secret-key-patentlens-ok"
os.environ["LLM_API_KEY"] = ""
os.environ["LLM_PROVIDER"] = ""
os.environ["FAISS_INDEX_PATH"] = str(BACKEND / "tests" / "tmp" / "patents.faiss")
os.environ["FAISS_MAPPING_PATH"] = str(BACKEND / "tests" / "tmp" / "vector_mapping.json")
os.environ["FAISS_META_PATH"] = str(BACKEND / "tests" / "tmp" / "index_meta.json")
os.environ["UPLOAD_DIR"] = str(BACKEND / "tests" / "tmp" / "uploads")
os.environ["REPORT_DIR"] = str(BACKEND / "tests" / "tmp" / "reports")
os.environ["PATENT_DATA_PATH"] = str(ROOT / "data" / "raw" / "synthetic_patents_fixture.csv")

sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.chunk import PatentChunk  # noqa: E402
from app.services.embeddings import EmbeddingService  # noqa: E402
from app.services.ingestion import import_csv  # noqa: E402
from app.services.vector_index import VectorIndex, reload_vector_index  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _prepare_db_and_index():
    Path(os.environ["FAISS_INDEX_PATH"]).parent.mkdir(parents=True, exist_ok=True)
    Path(os.environ["UPLOAD_DIR"]).mkdir(parents=True, exist_ok=True)
    Path(os.environ["REPORT_DIR"]).mkdir(parents=True, exist_ok=True)
    test_db = BACKEND / "tests" / "test.db"
    if test_db.exists():
        engine.dispose()
        try:
            test_db.unlink()
        except PermissionError:
            pass
    Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()
    try:
        import_csv(db, os.environ["PATENT_DATA_PATH"], batch_size=50)
        chunks = db.scalars(select(PatentChunk).order_by(PatentChunk.id)).all()
        embedder = EmbeddingService(model_name="hash-384", backend="hash")
        vectors = embedder.encode([c.text for c in chunks], batch_size=16)
        mapping = []
        for i, chunk in enumerate(chunks):
            chunk.vector_id = i
            mapping.append({"vector_id": i, "chunk_id": chunk.id, "patent_id": chunk.patent_id, "chunk_type": chunk.chunk_type})
        db.commit()
        index = VectorIndex()
        index.build(vectors, mapping, {"model_name": "hash-384", "embedding_backend": "hash", "dimension": 384})
        index.save()
        reload_vector_index()
    finally:
        db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_client(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "tester@example.com", "password": "password123", "full_name": "Test User"},
    )
    if response.status_code == 409:
        response = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    token = response.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
