# app/migrations/enable_uuid.py
from sqlalchemy import text
from ..db import engine


async def pgcrypto_enabled() -> None:
    async with engine.begin() as conn:
        res = await conn.execute(
            text("SELECT 1 FROM pg_extension WHERE extname='pgcrypto'")
        )

        if res.first() is None:
            await conn.execute(text("CREATE EXTENSION pgcrypto;"))
            return True
        return False

async def verify_uuid_support() -> None:
    # fails fast if pgcrypto / function not available
    async with engine.begin() as conn:
        await conn.execute(text("SELECT gen_random_uuid();"))