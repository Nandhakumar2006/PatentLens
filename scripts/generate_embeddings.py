#!/usr/bin/env python
"""Generate embeddings in batches and save a memory-mapped matrix."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.db.session import SessionLocal, database_status  # noqa: E402
from app.models.chunk import PatentChunk  # noqa: E402
from app.services.embeddings import EmbeddingService  # noqa: E402
from sqlalchemy import func, select  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--backend", default=None)
    parser.add_argument("--model", default=None)
    args = parser.parse_args()
    status = database_status()
    if not status["ok"]:
        raise SystemExit(f"Database connection failed: {status['message']}")

    settings = get_settings()
    embedder = EmbeddingService(model_name=args.model, backend=args.backend)
    probe = embedder.encode(["dimension probe"])
    dim = int(probe.shape[1])

    db = SessionLocal()
    try:
        total = db.scalar(select(func.count(PatentChunk.id))) or 0
        if total == 0:
            raise SystemExit("No patent chunks found. Import data first.")
        out_dir = Path(settings.FAISS_INDEX_PATH).parent
        out_dir.mkdir(parents=True, exist_ok=True)
        emb_path = out_dir / "embeddings.npy"
        map_path = Path(settings.FAISS_MAPPING_PATH)
        meta_path = Path(settings.FAISS_META_PATH)

        embeddings = np.lib.format.open_memmap(emb_path, mode="w+", dtype=np.float32, shape=(total, dim))
        mapping = []
        offset = 0
        batch_rows: list[PatentChunk] = []
        query = db.scalars(select(PatentChunk).order_by(PatentChunk.id)).yield_per(args.batch_size)
        for chunk in query:
            batch_rows.append(chunk)
            if len(batch_rows) >= args.batch_size:
                offset = _flush(embedder, embeddings, mapping, batch_rows, offset, args.batch_size)
                batch_rows = []
        if batch_rows:
            _flush(embedder, embeddings, mapping, batch_rows, offset, args.batch_size)
        embeddings.flush()
        map_path.write_text(json.dumps(mapping), encoding="utf-8")
        meta_path.write_text(
            json.dumps(
                {
                    "model_name": embedder.model_name,
                    "embedding_backend": embedder.backend,
                    "dimension": dim,
                    "vector_count": total,
                    "normalized": True,
                    "embeddings_path": str(emb_path),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print({"vectors": total, "dimension": dim, "embeddings": str(emb_path), "model": embedder.model_name})
    finally:
        db.close()


def _flush(embedder, embeddings, mapping, batch_rows, offset, batch_size) -> int:
    vectors = embedder.encode([row.text for row in batch_rows], batch_size=batch_size, show_progress=False)
    embeddings[offset : offset + len(batch_rows)] = vectors
    for i, row in enumerate(batch_rows):
        mapping.append(
            {
                "vector_id": offset + i,
                "chunk_id": row.id,
                "patent_id": row.patent_id,
                "chunk_type": row.chunk_type,
            }
        )
    print(f"embedded {offset + len(batch_rows)} chunks", flush=True)
    return offset + len(batch_rows)


if __name__ == "__main__":
    main()
