#!/usr/bin/env python
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.services.vector_index import get_vector_index  # noqa: E402


def main() -> None:
    settings = get_settings()
    index = get_vector_index()
    report = index.status()
    mapping_path = Path(settings.FAISS_MAPPING_PATH)
    if mapping_path.exists() and index.loaded:
        mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
        report["mapping_count"] = len(mapping)
        report["compatible"] = len(mapping) == index.ntotal
    else:
        report["compatible"] = False
    print(json.dumps(report, indent=2))
    if not report.get("ok") or report.get("compatible") is False:
        sys.exit(1)


if __name__ == "__main__":
    main()
