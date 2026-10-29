from __future__ import annotations

import hashlib
import logging
import threading

import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def l2_normalize(vectors: np.ndarray) -> np.ndarray:
    arr = np.asarray(vectors, dtype=np.float32)
    if arr.ndim == 1:
        arr = arr.reshape(1, -1)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-12)
    return arr / norms


class EmbeddingService:
    def __init__(self, model_name: str | None = None, backend: str | None = None, dimension: int = 384):
        settings = get_settings()
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.backend = (backend or settings.EMBEDDING_BACKEND).lower()
        self.dimension = dimension
        self._model = None
        self._lock = threading.Lock()

    def _load_sentence_transformer(self):
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is None:
                from sentence_transformers import SentenceTransformer

                logger.info("Loading embedding model %s", self.model_name)
                try:
                    self._model = SentenceTransformer(self.model_name, local_files_only=True)
                except Exception:
                    self._model = SentenceTransformer(self.model_name)
                self.dimension = int(self._model.get_sentence_embedding_dimension())
        return self._model

    def encode(self, texts: list[str], batch_size: int = 32, show_progress: bool = False) -> np.ndarray:
        cleaned = [t if t and t.strip() else " " for t in texts]
        if self.backend in {"hash", "test"}:
            return self._hash_encode(cleaned)
        model = self._load_sentence_transformer()
        vectors = model.encode(
            cleaned,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return np.asarray(vectors, dtype=np.float32)

    def encode_query(self, text: str) -> np.ndarray:
        if self.backend not in {"hash", "test"} and "bge" in self.model_name.lower():
            text = f"Represent this sentence for searching relevant passages: {text}"
        return self.encode([text])[0]

    def _hash_encode(self, texts: list[str]) -> np.ndarray:
        """Deterministic bag-of-ngrams hashing. Tests only — not a semantic model."""
        dim = self.dimension
        out = np.zeros((len(texts), dim), dtype=np.float32)
        for i, text in enumerate(texts):
            tokens = text.lower().split()
            for token in tokens:
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                idx = int.from_bytes(digest[:4], "little") % dim
                sign = 1.0 if digest[4] % 2 == 0 else -1.0
                out[i, idx] += sign
            for a, b in zip(tokens, tokens[1:]):
                digest = hashlib.sha256(f"{a}_{b}".encode("utf-8")).digest()
                idx = int.from_bytes(digest[:4], "little") % dim
                out[i, idx] += 0.5
        return l2_normalize(out)


_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service


def reset_embedding_service() -> None:
    global _service
    _service = None
