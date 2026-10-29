import logging
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app import models  # noqa: F401  — register all SQLAlchemy models
from app.models.user import User

logger = logging.getLogger(__name__)

PREDEFINED_ADMIN_EMAIL = "nandhakumar2006@gmail.com"
PREDEFINED_ADMIN_PASS = "nandha123"
PREDEFINED_ADMIN_NAME = "Nandhakumar (Admin)"


def migrate_schema():
    """Ensure `role` and `is_active` columns exist in users table across SQLite & MySQL."""
    try:
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            with engine.begin() as conn:
                if "role" not in columns:
                    logger.info("Adding 'role' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'user' NOT NULL"))
                if "is_active" not in columns:
                    logger.info("Adding 'is_active' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
    except Exception as exc:
        logger.warning("Schema migration warning: %s", exc)


def seed_admin_user():
    """Ensure the predefined admin user exists and has admin privileges."""
    db: Session = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == PREDEFINED_ADMIN_EMAIL).first()
        if admin is None:
            admin = User(
                email=PREDEFINED_ADMIN_EMAIL,
                password_hash=hash_password(PREDEFINED_ADMIN_PASS),
                full_name=PREDEFINED_ADMIN_NAME,
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Seeded primary admin user: %s", PREDEFINED_ADMIN_EMAIL)
        else:
            # Ensure privileges and active status
            admin.role = "admin"
            admin.is_active = True
            # Update password to ensure the requested password works
            admin.password_hash = hash_password(PREDEFINED_ADMIN_PASS)
            db.commit()
            logger.info("Updated primary admin user: %s", PREDEFINED_ADMIN_EMAIL)
    except Exception as exc:
        logger.error("Failed to seed admin user: %s", exc)
        db.rollback()
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    seed_admin_user()
    logger.info("Database schema initialized and admin verified")
