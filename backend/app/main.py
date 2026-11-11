import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, NoResultFound

from app.api import auth, dashboard, organisation, users
from app.config import settings
from app.database.session import engine

log = logging.getLogger("finguard")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")


def _startup_checks() -> None:
    """Print a plain-English diagnosis instead of leaving the first request to fail with a bare 500."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            roles = conn.execute(text("SELECT COUNT(*) FROM roles")).scalar_one()
    except Exception as exc:  # noqa: BLE001 - diagnostic only
        msg = str(getattr(exc, "orig", exc))
        log.error("DATABASE PROBLEM: %s", msg)
        if "Access denied" in msg:
            log.error("-> The user/password in backend/.env DATABASE_URL is wrong, or backend/.env does not exist yet.")
        elif "Unknown database" in msg:
            log.error("-> The 'finguard' database does not exist. Run database/schema.sql first.")
        elif "doesn't exist" in msg:
            log.error("-> Tables are missing. Run database/schema.sql, then indexes.sql and seed.sql.")
        elif "Can't connect" in msg or "Connection refused" in msg:
            log.error("-> MySQL is not running or is on a different host/port.")
        return
    if roles == 0:
        log.error("DATABASE PROBLEM: the roles table is empty. Run database/seed.sql, then restart.")
    else:
        log.info("Database OK (%s roles loaded).", roles)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _startup_checks()
    yield


app = FastAPI(title="FinGuard AI", version="0.1.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DBAPIError)
async def db_error_handler(request: Request, exc: DBAPIError):
    log.exception("Database error on %s %s", request.method, request.url.path)
    msg = str(getattr(exc, "orig", exc))
    if "Access denied" in msg or "Unknown database" in msg or "Can't connect" in msg or "Connection refused" in msg:
        detail = "The server cannot connect to the database. Check DATABASE_URL in backend/.env and that MySQL is running."
    elif "doesn't exist" in msg:
        detail = "Database tables are missing. Run database/schema.sql, indexes.sql and seed.sql."
    else:
        detail = "A database error occurred. See the backend terminal for details."
    return JSONResponse(status_code=503, content={"detail": detail})


@app.exception_handler(NoResultFound)
async def missing_reference_handler(request: Request, exc: NoResultFound):
    log.exception("Missing reference data on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=503,
        content={"detail": "Reference data is missing. Run database/seed.sql, then restart the backend."},
    )


app.include_router(auth.router)
app.include_router(organisation.router)
app.include_router(users.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
