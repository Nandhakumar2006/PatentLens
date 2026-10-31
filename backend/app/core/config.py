from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


def _absolute(path: str) -> str:
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = ROOT_DIR / candidate
    return str(candidate)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "mysql+pymysql://USER:PASSWORD@127.0.0.1:3306/patentlens"
    SECRET_KEY: str = "change-me-to-a-long-random-secret"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ADMIN_EMAILS: str = "nandhakumar2006@gmail.com"
    ADMIN_ACTION_SECRET: str = "PatentLens2026"

    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_BACKEND: str = "sentence-transformers"

    PATENT_DATA_PATH: str = str(ROOT_DIR / "data" / "raw" / "synthetic_patents_fixture.csv")
    FAISS_INDEX_PATH: str = str(ROOT_DIR / "data" / "indexes" / "patents.faiss")
    FAISS_MAPPING_PATH: str = str(ROOT_DIR / "data" / "indexes" / "vector_mapping.json")
    FAISS_META_PATH: str = str(ROOT_DIR / "data" / "indexes" / "index_meta.json")

    UPLOAD_DIR: str = str(ROOT_DIR / "storage" / "uploads")
    REPORT_DIR: str = str(ROOT_DIR / "storage" / "reports")
    MAX_UPLOAD_MB: int = 15

    LLM_PROVIDER: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = ""
    LLM_BASE_URL: str = ""

    LOG_LEVEL: str = "INFO"
    CHUNK_SIZE_CHARS: int = 1400
    CHUNK_OVERLAP_CHARS: int = 180
    SEARCH_CANDIDATE_CHUNKS: int = 200
    DEFAULT_TOP_K: int = 10
    MAX_TOP_K: int = 50

    @model_validator(mode="after")
    def resolve_relative_paths(self):
        self.PATENT_DATA_PATH = _absolute(self.PATENT_DATA_PATH)
        self.FAISS_INDEX_PATH = _absolute(self.FAISS_INDEX_PATH)
        self.FAISS_MAPPING_PATH = _absolute(self.FAISS_MAPPING_PATH)
        self.FAISS_META_PATH = _absolute(self.FAISS_META_PATH)
        self.UPLOAD_DIR = _absolute(self.UPLOAD_DIR)
        self.REPORT_DIR = _absolute(self.REPORT_DIR)
        if self.DATABASE_URL.startswith("sqlite:///"):
            rest = self.DATABASE_URL[len("sqlite:///") :]
            if rest.startswith("./") or (rest and not Path(rest).is_absolute() and not rest.startswith("/")):
                self.DATABASE_URL = "sqlite:///" + str((ROOT_DIR / rest).resolve()).replace("\\", "/")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
