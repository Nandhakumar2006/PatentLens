#!/usr/bin/env python
"""Create the patentlens database if credentials in DATABASE_URL work."""
from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.config import get_settings  # noqa: E402


def main() -> None:
    settings = get_settings()
    url = settings.DATABASE_URL
    if not url.startswith("mysql"):
        print("DATABASE_URL is not MySQL; skipping database creation.")
        return
    parsed = urlparse(url.replace("mysql+pymysql", "mysql", 1))
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 3306
    dbname = (parsed.path or "/patentlens").lstrip("/")
    try:
        import pymysql
    except ImportError as exc:
        raise SystemExit("PyMySQL is required") from exc
    conn = pymysql.connect(host=host, user=user, password=password, port=port, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        print(f"Database `{dbname}` is ready on {host}:{port}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
