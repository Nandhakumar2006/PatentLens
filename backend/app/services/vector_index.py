from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class VectorIndex:
    def __init__(self):
        self.index = None
        self.mapping: list[dict] = []
        self.meta: dict = {}
        self.backend = "unloaded"
        self._numpy_vectors: np.ndarray | None = None

    @property
    def loaded(self) -> bool:
        return self.index is not None or self._numpy_vectors is not None

    def status(self) -> dict:
        settings = get_settings()
        index_path = Path(settings.FAISS_INDEX_PATH)
        mapping_path = Path(settings.FAISS_MAPPING_PATH)
        meta_path = Path(settings.FAISS_META_PATH)
        return {
            "ok": self.loaded,
            "backend": self.backend,
            "vector_count": self.ntotal,
            "dimension": self.dimension,
            "model_name": self.meta.get("model_name"),
            "embedding_backend": self.meta.get("embedding_backend"),
            "index_exists": index_path.exists(),
            "mapping_exists": mapping_path.exists(),
            "meta_exists": meta_path.exists(),
            "index_path": str(index_path),
        }

    @property
    def ntotal(self) -> int:
        if self.index is not None:
            return int(self.index.ntotal)
        if self._numpy_vectors is not None:
            return int(self._numpy_vectors.shape[0])
        return 0

    @property
    def dimension(self) -> int | None:
        if self.index is not None:
            return int(self.index.d)
        if self._numpy_vectors is not None:
            return int(self._numpy_vectors.shape[1])
        return self.meta.get("dimension")

    def build(self, vectors: np.ndarray, mapping: list[dict], meta: dict) -> None:
        vectors = np.asarray(vectors, dtype=np.float32)
        if vectors.ndim != 2:
            raise ValueError("vectors must be 2-D")
        faiss = _try_import_faiss()
        if faiss is not None:
            index = faiss.IndexFlatIP(vectors.shape[1])
            index.add(vectors)
            self.index = index
            self._numpy_vectors = None
            self.backend = "faiss-IndexFlatIP"
        else:
            logger.warning("FAISS is unavailable; using NumPy inner-product search with the same metric")
            self.index = None
            self._numpy_vectors = vectors
            self.backend = "numpy-IndexFlatIP-compatible"
        self.mapping = mapping
        self.meta = meta

    def save(self) -> None:
        settings = get_settings()
        index_path = Path(settings.FAISS_INDEX_PATH)
        mapping_path = Path(settings.FAISS_MAPPING_PATH)
        meta_path = Path(settings.FAISS_META_PATH)
        index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss = _try_import_faiss()
        if self.index is not None and faiss is not None:
            faiss.write_index(self.index, str(index_path))
        elif self._numpy_vectors is not None:
            np.save(index_path.with_suffix(".npy"), self._numpy_vectors)
        mapping_path.write_text(json.dumps(self.mapping), encoding="utf-8")
        payload = {
            **self.meta,
            "backend": self.backend,
            "vector_count": self.ntotal,
            "normalized": True,
            "metric": "inner_product",
        }
        meta_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def load(self) -> bool:
        settings = get_settings()
        index_path = Path(settings.FAISS_INDEX_PATH)
        mapping_path = Path(settings.FAISS_MAPPING_PATH)
        meta_path = Path(settings.FAISS_META_PATH)
        npy_path = index_path.with_suffix(".npy")
        if not mapping_path.exists() or not meta_path.exists():
            logger.warning("Index mapping or metadata missing")
            return False
        self.mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
        self.meta = json.loads(meta_path.read_text(encoding="utf-8"))
        faiss = _try_import_faiss()
        if index_path.exists() and faiss is not None:
            self.index = faiss.read_index(str(index_path))
            self._numpy_vectors = None
            self.backend = "faiss-IndexFlatIP"
            if self.index.ntotal != len(self.mapping):
                logger.error("Index/mapping size mismatch: %s vs %s", self.index.ntotal, len(self.mapping))
                return False
            return True
        if npy_path.exists():
            self._numpy_vectors = np.load(npy_path)
            self.index = None
            self.backend = "numpy-IndexFlatIP-compatible"
            if self._numpy_vectors.shape[0] != len(self.mapping):
                logger.error("Numpy index/mapping size mismatch")
                return False
            return True
        logger.warning("No FAISS or NumPy index file found")
        return False

    def search(self, query_vector: np.ndarray, top_k: int) -> list[tuple[int, float]]:
        if not self.loaded:
            raise RuntimeError("Vector index is not loaded")
        q = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
        k = min(top_k, self.ntotal)
        if k <= 0:
            return []
        if self.index is not None:
            scores, ids = self.index.search(q, k)
            pairs = []
            for score, vid in zip(scores[0], ids[0]):
                if vid < 0:
                    continue
                pairs.append((int(vid), float(score)))
            return pairs
        scores = (self._numpy_vectors @ q.T).ravel()
        if k >= len(scores):
            order = np.argsort(-scores)
        else:
            part = np.argpartition(-scores, k)[:k]
            order = part[np.argsort(-scores[part])]
        return [(int(i), float(scores[i])) for i in order]


_index: VectorIndex | None = None


def _try_import_faiss():
    try:
        import faiss

        return faiss
    except Exception as exc:
        logger.warning("Could not import FAISS: %s", exc)
        return None


def get_vector_index() -> VectorIndex:
    global _index
    if _index is None:
        _index = VectorIndex()
        _index.load()
    return _index


def reload_vector_index() -> VectorIndex:
    global _index
    _index = VectorIndex()
    _index.load()
    return _index


def rebuild_index_from_database(db) -> dict:
    from sqlalchemy import select
    from app.models.chunk import PatentChunk
    from app.services.embeddings import get_embedding_service

    chunks = db.scalars(select(PatentChunk).order_by(PatentChunk.id)).all()
    if not chunks:
        return {
            "success": False,
            "total_vectors": 0,
            "dimension": 0,
            "message": "No patent chunks in database to index",
        }

    embedder = get_embedding_service()
    texts = [c.text for c in chunks]
    vectors = embedder.encode(texts, batch_size=32)

    mapping = []
    for vid, chunk in enumerate(chunks):
        chunk.vector_id = vid
        mapping.append({
            "vector_id": vid,
            "chunk_id": chunk.id,
            "patent_id": chunk.patent_id,
            "chunk_type": chunk.chunk_type,
            "chunk_index": chunk.chunk_index,
        })
    db.commit()

    meta = {
        "model_name": embedder.model_name,
        "embedding_backend": embedder.backend,
        "dimension": int(vectors.shape[1]),
        "vector_count": int(vectors.shape[0]),
    }

    index = VectorIndex()
    index.build(vectors, mapping, meta)
    index.save()

    reload_vector_index()
    return {
        "success": True,
        "total_vectors": int(vectors.shape[0]),
        "dimension": int(vectors.shape[1]),
        "message": f"Successfully indexed {len(vectors)} vector chunks",
    }
