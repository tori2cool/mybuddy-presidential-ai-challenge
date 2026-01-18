# backend/app/celery_app.py
from __future__ import annotations

import logging
import os

from celery import Celery
from celery.schedules import crontab
from celery.signals import setup_logging as celery_setup_logging

from .config import settings
from .logging_config import setup_logging

_logging_initialized = False


def _init_celery_logging() -> None:
    """Initialize our structured logging inside Celery processes.

    Celery configures its own logging via signals. We hook into that and run
    app.logging_config.setup_logging() so worker/beat logs go to the correct
    rotated file based on MYBUDDY_LOG_TARGET.

    This function is idempotent.
    """
    global _logging_initialized
    if _logging_initialized:
        return

    setup_logging()

    target = (os.getenv("MYBUDDY_LOG_TARGET") or "unknown").strip().lower()
    log_dir = os.getenv("MYBUDDY_LOG_DIR") or "./logs"
    log_filename = {"api": "api.log", "celery": "celery.log", "beat": "beat.log"}.get(target, "api.log")
    logging.getLogger(__name__).info(
        "Celery logging initialized (MYBUDDY_LOG_TARGET=%s, file=%s/%s)",
        target,
        log_dir,
        log_filename,
    )

    _logging_initialized = True


@celery_setup_logging.connect
def _configure_celery_logging(**kwargs) -> None:  # pragma: no cover
    """Called by Celery when it is about to set up logging.

    Returning after configuring logging prevents Celery from overriding our
    handlers/formatters.
    """
    _init_celery_logging()


# Name matches your package
celery_app = Celery(
    "app",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Basic Celery configuration
celery_app.conf.timezone = "UTC"
celery_app.conf.task_track_started = True

# 🔑 This is the missing piece: tell Celery where to find tasks
celery_app.autodiscover_tasks(["app"])

# Periodic tasks
celery_app.conf.beat_schedule = {
    "heartbeat-every-minute": {
        "task": "app.tasks.heartbeat",
        "schedule": crontab(minute="*"),
    },
}
