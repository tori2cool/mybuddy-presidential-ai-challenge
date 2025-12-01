# backend/app/tasks.py
import json
from time import sleep

import redis

from .celery_app import celery_app
from .config import settings

# Synchronous Redis client for publishing from Celery workers
redis_client = redis.Redis.from_url(settings.redis_url)


@celery_app.task(bind=True)
def long_running_task(self, payload: dict | None = None) -> str:
    """
    Example long-running task that reports progress via Redis pub/sub.

    The WebSocket subscribes on channel: job_progress:<job_id>
    where <job_id> is the Celery task id (self.request.id).
    """
    total_steps = 5

    for i in range(total_steps):
        # Simulate work
        sleep(1)

        progress = int((i + 1) / total_steps * 100)
        message = {
            "job_id": self.request.id,
            "progress": progress,
            "step": i + 1,
            "total_steps": total_steps,
            "payload": payload or {},
        }

        channel = f"job_progress:{self.request.id}"
        redis_client.publish(channel, json.dumps(message))

    return f"Job {self.request.id} completed"


@celery_app.task(name="backend.app.tasks.heartbeat")
def heartbeat() -> str:
    msg = "Heartbeat task ran"
    print(msg)
    return msg
