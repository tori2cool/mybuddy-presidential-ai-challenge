# backend/app/db.py
from __future__ import annotations

from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from .config import settings


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


def _split_sql_statements(script: str) -> list[str]:
    """
    Minimal SQL splitter that works for typical migration scripts:
    - Removes full-line comments starting with --
    - Removes inline -- comments
    - Splits on semicolons

    NOTE: Not suitable for SQL that contains semicolons inside $$...$$ blocks
    (functions/triggers). Keep migrations "simple" or handle those separately.
    """
    lines: list[str] = []
    for raw in script.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("--"):
            continue
        # Remove inline comments
        if "--" in raw:
            raw = raw.split("--", 1)[0]
        if raw.strip():
            lines.append(raw)

    cleaned = "\n".join(lines)
    parts = [p.strip() for p in cleaned.split(";")]
    return [p for p in parts if p]


async def _exec_sql_script(conn, script: str) -> None:
    """
    Execute a multi-statement SQL script safely under asyncpg by running
    each statement separately (no multi-command prepared statements).
    """
    for stmt in _split_sql_statements(script):
        # exec_driver_sql sends raw SQL to the driver; great for DDL/migrations
        await conn.exec_driver_sql(stmt)


# Init DB – creates SQLModel tables then applies lightweight SQL migrations
async def init_db() -> None:
    """Initialize database structures.

    - Creates SQLModel tables first.
    - Then applies any pending `backend/migrations/*.sql` migrations.
    """
    # 1) Create all tables defined in SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # 2) Apply SQL migrations in order (if any exist)
    migrations_dir = Path(__file__).parent.parent / "migrations"
    if not migrations_dir.exists():
        return

    # Create migrations tracking table (single statement)
    async with engine.begin() as conn:
        await conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS _migrations_applied (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT NOW()
            )
            """
        )

    # Get list of applied migrations
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT filename FROM _migrations_applied ORDER BY filename")
        )
        applied = {row[0] for row in result.all()}

    # Apply each unapplied migration in sorted order
    for migration_file in sorted(migrations_dir.glob("*.sql")):
        if migration_file.name in applied:
            continue

        print(f"Applying migration: {migration_file.name}")
        sql = migration_file.read_text()

        async with engine.begin() as conn:
            await _exec_sql_script(conn, sql)
            await conn.execute(
                text("INSERT INTO _migrations_applied (filename) VALUES (:filename)"),
                {"filename": migration_file.name},
            )

        print(f"Applied migration: {migration_file.name}")
