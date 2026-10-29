#!/usr/bin/env python
"""Batch-import patents from CSV into MySQL."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.db.init_db import init_db  # noqa: E402
from app.db.session import SessionLocal, database_status  # noqa: E402
from app.services.ingestion import import_csv  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=None)
    parser.add_argument("--batch-size", type=int, default=200)
    args = parser.parse_args()
    status = database_status()
    if not status["ok"]:
        raise SystemExit(f"Database connection failed: {status['message']}")
    init_db()
    settings = get_settings()
    path = args.input or settings.PATENT_DATA_PATH
    db = SessionLocal()
    try:
        result = import_csv(db, path, batch_size=args.batch_size)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
