#!/usr/bin/env python
"""Validate and write a cleaned CSV for patent ingestion."""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.ingestion import EXPECTED_FIELDS, clean_row  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean a patent CSV without loading it all as objects")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default=str(Path("data/processed/patents_clean.csv")))
    args = parser.parse_args()
    src = Path(args.input)
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    skipped = 0
    with src.open(encoding="utf-8-sig", newline="") as inf, dest.open("w", encoding="utf-8", newline="") as outf:
        reader = csv.DictReader(inf)
        writer = csv.DictWriter(outf, fieldnames=EXPECTED_FIELDS)
        writer.writeheader()
        for raw in reader:
            cleaned = clean_row(raw)
            if cleaned is None:
                skipped += 1
                continue
            writer.writerow(
                {
                    "patent_id": cleaned["patent_id"],
                    "publication_number": cleaned["publication_number"] or "",
                    "title": cleaned["title"] or "",
                    "abstract": cleaned["abstract"] or "",
                    "claims": cleaned["claims_text"] or "",
                    "description": cleaned["description"] or "",
                    "publication_date": cleaned["publication_date"].isoformat() if cleaned["publication_date"] else "",
                    "ipc_cpc_codes": cleaned["ipc_cpc_codes"] or "",
                    "inventor": cleaned["inventor"] or "",
                    "applicant": cleaned["applicant"] or "",
                    "country": cleaned["country"] or "",
                    "source_url": cleaned["source_url"] or "",
                }
            )
            kept += 1
    print({"kept": kept, "skipped": skipped, "output": str(dest)})


if __name__ == "__main__":
    main()
