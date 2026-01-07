# app/logging_config.py
from __future__ import annotations

import logging
import sys
import warnings

from .config import settings


def setup_logging() -> None:
    log_level_str = (settings.log_level or "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    root = logging.getLogger()
    if root.handlers:
        root.setLevel(log_level)
        for name in (
            "mybuddy",
            "mybuddy.api",
            "uvicorn",
            "uvicorn.error",
            "uvicorn.access",
            "sqlalchemy.engine",
            "sqlalchemy.pool",
        ):
            logging.getLogger(name).setLevel(log_level)
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root.setLevel(log_level)
    root.addHandler(handler)

    # App loggers
    logging.getLogger("mybuddy").setLevel(log_level)
    logging.getLogger("mybuddy.api").setLevel(log_level)

    # Uvicorn loggers
    logging.getLogger("uvicorn").setLevel(log_level)
    logging.getLogger("uvicorn.error").setLevel(log_level)
    logging.getLogger("uvicorn.access").setLevel(log_level)

    # SQLAlchemy (very useful when “nothing is being saved”)
    logging.getLogger("sqlalchemy.engine").setLevel(log_level)
    logging.getLogger("sqlalchemy.pool").setLevel(log_level)

    # Capture warnings into logs
    logging.captureWarnings(True)
    warnings.simplefilter("default")
