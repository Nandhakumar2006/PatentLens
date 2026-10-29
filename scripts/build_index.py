#!/usr/bin/env python
"""Build a FAISS IndexFlatIP from saved embeddings without recomputing them."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import SessionLocal, database_status  # noqa: E402
from app.models.chunk import PatentChunk  # noqa: E402
from app.services.vector_index import VectorIndex, reload_vector_index  # noqa: E402


def main() -> None:
    settings = get_settings()
    emb_path = Path(settings.FAISS_INDEX_PATH).parent / "embeddings.npy"
    map_path = Path(settings.FAISS_MAPPING_PATH)
    meta_path = Path(settings.FAISS_META_PATH)
    if not emb_path.exists() or not map_path.exists():
        raise SystemExit("Missing embeddings.npy or vector mapping. Run generate_embeddings.py first.")
    vectors = np.load(emb_path, mmap_mode="r")
    mapping = json.loads(map_path.read_text(encoding="utf-8"))
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    if vectors.shape[0] != len(mapping):
        raise SystemExit(f"Incompatible index: {vectors.shape[0]} vectors vs {len(mapping)} mapping rows")

    # Add in batches so a full dense copy is not required beyond FAISS internals.
    index = VectorIndex()
    batch = 2048
    first = np.asarray(vectors[0: min(batch, vectors.shape[0])], dtype=np.float32)
    index.build(first, mapping[: first.shape[0]], meta)
    start = first.shape[0]
    while start < vectors.shape[0]:
        part = np.asarray(vectors[start : start + batch], dtype=np.float32)
        if index.index is not None:
            index.index.add(part)
        else:
            index._numpy_vectors = np.vstack([index._numpy_vectors, part])
        start += part.shape[0]
    index.mapping = mapping
    index.meta = {**meta, "vector_count": int(vectors.shape[0])}
    index.save()

    status = database_status()
    if status["ok"]:
        init_db()
        db = SessionLocal()
        try:
            for item in mapping:
                chunk = db.get(PatentChunk, item["chunk_id"])
                if chunk:
                    chunk.vector_id = item["vector_id"]
            db.commit()
        finally:
            db.close()
    reload_vector_index()
    print({"ok": True, "backend": index.backend, "vectors": index.ntotal, "path": settings.FAISS_INDEX_PATH})


if __name__ == "__main__":
    main()
