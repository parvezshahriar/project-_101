from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
import os
try:
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
except ImportError:
    AsyncSession = None


db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:110032@localhost:5432/postgres",
)

engine = create_engine(db_url)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

if AsyncSession:
    async_db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    async_engine = create_async_engine(async_db_url)
    AsyncSessionLocal = sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
else:
    async_engine = None

    AsyncSessionLocal = None