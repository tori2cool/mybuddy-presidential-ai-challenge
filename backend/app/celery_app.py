# backend/app/celery_app.py
from celery import Celery
from celery.schedules import crontab

from .config import settings

# Name matches your package
celery_app = Celery(
    "backend.app",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Basic Celery configuration
celery_app.conf.timezone = "UTC"
celery_app.conf.task_track_started = True

# 🔑 This is the missing piece: tell Celery where to find tasks
celery_app.autodiscover_tasks(["backend.app"])

# Periodic tasks
celery_app.conf.beat_schedule = {
    "heartbeat-every-minute": {
        "task": "backend.app.tasks.heartbeat",
        "schedule": crontab(minute="*"),
    },
}
