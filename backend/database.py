import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()


class Base(DeclarativeBase):
    pass


_engine = None
_AsyncSessionLocal = None


def setup_db():
    global _engine, _AsyncSessionLocal
    _url = os.getenv("DATABASE_URL", "")
    if not _url:
        raise RuntimeError("DATABASE_URL is not set in backend/.env")
    if _url.startswith("postgres://"):
        _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif _url.startswith("postgresql://") and "+asyncpg" not in _url:
        _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)
    _engine = create_async_engine(_url, echo=False, connect_args={"statement_cache_size": 0})
    _AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
    return _engine


async def get_db():
    async with _AsyncSessionLocal() as session:
        yield session
