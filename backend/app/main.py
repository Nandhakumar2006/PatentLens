from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.init_db import init_db
from app.db.session import database_status
from app.routers import admin, analysis, auth, documents, health, patents, reports, search
from app.services.vector_index import get_vector_index

setup_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    status = database_status()
    if status["ok"]:
        init_db()
    get_vector_index()
    yield


app = FastAPI(title="PatentLens", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(patents.router)
app.include_router(analysis.router)
app.include_router(documents.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.exception_handler(RequestValidationError)
def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request", "errors": exc.errors()})


@app.exception_handler(SQLAlchemyError)
def db_handler(_: Request, exc: SQLAlchemyError):
    import logging
    logging.getLogger("app.db").exception("Database operation failed: %s", exc)
    return JSONResponse(status_code=500, content={"detail": f"Database error: {str(exc)}"})
