# app/logging_config.py
from __future__ import annotations

import logging
import os
import sys
import warnings
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .config import settings


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


def _get_log_target() -> str:
    target = (os.getenv("MYBUDDY_LOG_TARGET") or "api").strip().lower()
    if target not in {"api", "celery", "beat"}:
        target = "api"
    return target


def _get_log_dir() -> Path:
    # start.sh exports MYBUDDY_LOG_DIR (default ./logs when running from backend/)
    # When running outside start.sh, default to ./logs in current working directory.
    raw = os.getenv("MYBUDDY_LOG_DIR") or "./logs"
    return Path(raw).expanduser()


def setup_logging() -> None:
    # Desired defaults:
    # - file logs: INFO
    # - root logger: DEBUG
    # - console: WARNING (optional; enabled by default)
    file_level = settings.log_level
    root_level = settings.log_level
    console_level = settings.log_level

    # Keep honoring existing MYBUDDY_LOG_LEVEL as a convenience override for app loggers
    log_level_str = (settings.log_level or "INFO").upper()
    app_level = getattr(logging, log_level_str, logging.INFO)

    log_dir = _get_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)

    target = _get_log_target()
    log_filename = {"api": "api.log", "celery": "celery.log", "beat": "beat.log"}[target]
    log_path = log_dir / log_filename

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Reset handlers to avoid duplicate logs (e.g., in reload/import scenarios)
    root = logging.getLogger()
    root.handlers = []
    root.propagate = False

    root.setLevel(root_level)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=2_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setLevel(file_level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    enable_console = _env_bool("MYBUDDY_ENABLE_CONSOLE_LOGS", True)
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(console_level)
        console_handler.setFormatter(formatter)
        root.addHandler(console_handler)

    # App loggers
    for name in ("mybuddy", "mybuddy.api"):
        logger = logging.getLogger(name)
        logger.handlers = []
        logger.propagate = True
        logger.setLevel(app_level)

    # Uvicorn loggers (send to file; keep console quiet via handler levels)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers = []
        logger.propagate = True
        logger.setLevel(file_level)

    # SQLAlchemy (useful in file logs, but too noisy for console)
    for name in ("sqlalchemy.engine", "sqlalchemy.pool"):
        logger = logging.getLogger(name)
        logger.handlers = []
        logger.propagate = True
        logger.setLevel(file_level)

    # Quiet especially noisy libs (file-only via root handler; console already WARNING)
    for name in ("httpcore", "httpx", "asyncio", "urllib3"):
        logging.getLogger(name).setLevel(logging.INFO)

    # Capture warnings into logs
    logging.captureWarnings(True)
    warnings.simplefilter("default")
