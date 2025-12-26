# backend/app/tasks.py
import asyncio
import json
import logging
from time import sleep

import redis

from .celery_app import celery_app
from .config import settings
from .db import AsyncSessionLocal
from .seed import seed

logger = logging.getLogger(__name__)

# Synchronous Redis client for publishing from Celery workers
redis_client = redis.Redis.from_url(settings.redis_url)

@celery_app.task(name="app.tasks.seed_content")
def seed_content() -> dict:
    """Seed core content tables idempotently.

    Runs in a Celery worker (sync context), so we spin up an event loop to
    perform async DB calls.
    """

    async def _run() -> dict:
        async with AsyncSessionLocal() as session:
            # Run the new seed function
            await seed()
            return {"seeded": True}

    result = asyncio.run(_run())
    logger.info("seed_content completed: %s", result)
    return result

@celery_app.task(name="app.tasks.heartbeat")
def heartbeat() -> str:
    msg = "Heartbeat task ran"
    print(msg)
    return msg
