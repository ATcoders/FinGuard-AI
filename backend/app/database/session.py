"""Database access.

Plain SQL through SQLAlchemy Core: one connection per request, wrapped in a
transaction that commits when the request succeeds and rolls back on any error.
"""
from sqlalchemy import create_engine

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    future=True,
)


def get_db():
    with engine.begin() as conn:
        yield conn
