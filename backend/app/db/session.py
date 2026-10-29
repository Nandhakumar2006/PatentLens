import logging
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()


def _make_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    elif "pymysql" in url:
        connect_args = {"connect_timeout": 2}
    return create_engine(
        url,
        pool_pre_ping=True,
        connect_args=connect_args,
        future=True,
    )


# Attempt configured database URL
_active_url = _settings.DATABASE_URL
engine = _make_engine(_active_url)

# Test connection, fallback to local sqlite if primary cannot be reached
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
except Exception as _e:
    if not _active_url.startswith("sqlite"):
        logger.warning(
            "Primary database (%s) unreachable (%s). Falling back to local SQLite at data/patentlens.db",
            _active_url.split("://", 1)[0],
            _e,
        )
        sqlite_path = Path(__file__).resolve().parents[3] / "data" / "patentlens.db"
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        _active_url = f"sqlite:///{sqlite_path.as_posix()}"
        engine = _make_engine(_active_url)

if _active_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def database_status() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "ok": True,
            "message": "Database connection succeeded",
            "url_scheme": _active_url.split("://", 1)[0],
            "is_sqlite": _active_url.startswith("sqlite"),
        }
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return {
            "ok": False,
            "message": "Database connection failed",
            "url_scheme": _active_url.split("://", 1)[0],
            "is_sqlite": _active_url.startswith("sqlite"),
        }
