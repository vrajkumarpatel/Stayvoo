import os
import sys

# Ensure `backend/` (this file's parent directory) is importable as the root for
# `models`, `services.*`, `routers.*` — matches how the app itself is run
# (`cd backend && uvicorn main:app`), regardless of pytest's invocation directory.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
import models  # noqa: F401  — populates Base.metadata with all model classes


@pytest.fixture
async def db_session():
    """A fresh in-memory SQLite DB per test — isolated from the real (Supabase)
    DATABASE_URL, so unit tests never touch production data."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()
