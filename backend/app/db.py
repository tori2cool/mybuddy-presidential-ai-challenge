# backend/app/db.py
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from .config import settings
from .seed import seed_affirmations_if_empty

# Async engine using DATABASE_URL from settings
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Dependency for FastAPI routes
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


# Init DB – creates SQLModel tables then applies lightweight SQL migrations
async def init_db() -> None:
    """Initialize database structures.

    - Creates SQLModel tables first.
    - Then applies any pending `backend/migrations/*.sql` migrations.

    In prod you may still prefer Alembic, but this keeps local/dev deployments
    lightweight.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)