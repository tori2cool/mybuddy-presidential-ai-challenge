# backend/app/db.py
from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from .config import settings


# NOTE: Celery uses a prefork worker model by default. Async SQLAlchemy engines
# (and their underlying asyncpg pools) are not fork-safe. If an engine is
# created at import-time in the parent process, child workers can inherit the
# pool and then hit cross-loop/cross-connection issues.
#
# To avoid this, we lazily initialize the engine/sessionmaker per-process and
# recreate them automatically if the PID changes.

_ENGINE: Optional[AsyncEngine] = None
_ENGINE_PID: Optional[int] = None
_ENGINE_LOOP_ID: Optional[int] = None
_SESSIONMAKER: Optional[sessionmaker] = None
_SESSIONMAKER_PID: Optional[int] = None
_SESSIONMAKER_LOOP_ID: Optional[int] = None


def _get_running_loop_id() -> Optional[int]:
    """Return current running loop id, or None if not in an event loop.

    Celery tasks call asyncio.run() per task, which creates a *new* event loop
    each time. asyncpg pools are bound to the loop they were created in, so we
    must not reuse an AsyncEngine (or its pool) across different loops within
    the same worker process.
    """
    try:
        import asyncio

        return id(asyncio.get_running_loop())
    except RuntimeError:
        return None


def get_engine() -> AsyncEngine:
    global _ENGINE, _ENGINE_PID, _ENGINE_LOOP_ID, _SESSIONMAKER, _SESSIONMAKER_LOOP_ID

    pid = os.getpid()
    loop_id = _get_running_loop_id()

    needs_new = _ENGINE is None or _ENGINE_PID != pid
    if loop_id is not None and _ENGINE_LOOP_ID is not None and _ENGINE_LOOP_ID != loop_id:
        # Loop changed inside same PID (common with asyncio.run() per Celery task).
        # Do NOT dispose here (can schedule work onto a closing/closed loop and
        # produce "Event loop is closed"). Instead, drop references so a new
        # engine/pool is created for the new loop.
        _ENGINE = None
        _SESSIONMAKER = None
        _SESSIONMAKER_LOOP_ID = loop_id
        needs_new = True

    if needs_new:
        _ENGINE = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        _ENGINE_PID = pid
        _ENGINE_LOOP_ID = loop_id

    return _ENGINE


class _EngineProxy:
    """Backward-compatible proxy for legacy `from app.db import engine` imports.

    This object is *fork-safe*: it never creates an engine at import-time.
    Each attribute access is delegated to the per-process engine returned by
    `get_engine()`.
    """

    def __getattr__(self, name: str):
        return getattr(get_engine(), name)


# Legacy alias (do NOT create a real engine at import-time).
engine = _EngineProxy()


def get_async_sessionmaker() -> sessionmaker:
    global _SESSIONMAKER, _SESSIONMAKER_PID, _SESSIONMAKER_LOOP_ID

    pid = os.getpid()
    loop_id = _get_running_loop_id()

    needs_new = _SESSIONMAKER is None or _SESSIONMAKER_PID != pid
    if loop_id is not None and _SESSIONMAKER_LOOP_ID is not None and _SESSIONMAKER_LOOP_ID != loop_id:
        needs_new = True

    if needs_new:
        _SESSIONMAKER = sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
        _SESSIONMAKER_PID = pid
        _SESSIONMAKER_LOOP_ID = loop_id

    return _SESSIONMAKER


# Dependency for FastAPI routes
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    AsyncSessionLocal = get_async_sessionmaker()
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
    engine_ = get_engine()
    async with engine_.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # 2) Apply SQL migrations in order (if any exist)
    migrations_dir = Path(__file__).parent.parent / "migrations"
    if not migrations_dir.exists():
        return

    # Create migrations tracking table (single statement)
    engine_ = get_engine()
    async with engine_.begin() as conn:
        await conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS _migrations_applied (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT NOW()
            )
            """
        )

    # Get list of applied migrations
    engine_ = get_engine()
    async with engine_.begin() as conn:
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

        engine_ = get_engine()
        async with engine_.begin() as conn:
            await _exec_sql_script(conn, sql)
            await conn.execute(
                text("INSERT INTO _migrations_applied (filename) VALUES (:filename)"),
                {"filename": migration_file.name},
            )

        print(f"Applied migration: {migration_file.name}")
