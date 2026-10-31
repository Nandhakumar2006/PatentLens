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
PREDEFINED_ADMIN_USERNAME = "Nandha-01"
PREDEFINED_ADMIN_BIONAME = "Nandhakumar"
PREDEFINED_ADMIN_PASS = "nandha123"


def migrate_schema():
    """Ensure `role`, `is_active`, `username`, `bio_name`, and `bio_name_updated_at` columns exist."""
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
                if "username" not in columns:
                    logger.info("Adding 'username' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL"))
                if "bio_name" not in columns:
                    logger.info("Adding 'bio_name' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN bio_name VARCHAR(255) NULL"))
                if "bio_name_updated_at" not in columns:
                    logger.info("Adding 'bio_name_updated_at' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN bio_name_updated_at DATETIME NULL"))
    except Exception as exc:
        logger.warning("Schema migration warning: %s", exc)


def seed_admin_user():
    """Ensure the predefined admin user exists and has admin privileges with exact username and bio name."""
    db: Session = SessionLocal()
    try:
        admin = db.query(User).filter(
            (User.email == PREDEFINED_ADMIN_EMAIL) | (User.username == PREDEFINED_ADMIN_USERNAME)
        ).first()

        if admin is None:
            admin = User(
                email=PREDEFINED_ADMIN_EMAIL,
                username=PREDEFINED_ADMIN_USERNAME,
                bio_name=PREDEFINED_ADMIN_BIONAME,
                full_name=PREDEFINED_ADMIN_BIONAME,
                password_hash=hash_password(PREDEFINED_ADMIN_PASS),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Seeded primary admin user: %s (@%s)", PREDEFINED_ADMIN_EMAIL, PREDEFINED_ADMIN_USERNAME)
        else:
            admin.email = PREDEFINED_ADMIN_EMAIL
            admin.username = PREDEFINED_ADMIN_USERNAME
            admin.bio_name = PREDEFINED_ADMIN_BIONAME
            admin.full_name = PREDEFINED_ADMIN_BIONAME
            admin.role = "admin"
            admin.is_active = True
            admin.password_hash = hash_password(PREDEFINED_ADMIN_PASS)
            db.commit()
            logger.info("Updated primary admin user: %s (@%s)", PREDEFINED_ADMIN_EMAIL, PREDEFINED_ADMIN_USERNAME)
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
