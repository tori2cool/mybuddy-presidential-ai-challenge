"""
Logging configuration for the MyBuddy backend.

Configures Python's logging module to output structured logs to stdout,
appropriate for Docker/containerized environments.
"""
from __future__ import annotations

import logging
import sys

from .config import settings


def setup_logging() -> None:
    """
    Configure logging for the application.

    This function:
    - Creates a StreamHandler that writes to stdout
    - Sets up a formatter with timestamp, level, logger name, and message
    - Configures the root logger with the log level from settings
    - Configures the "mybuddy.api" logger (used by middleware)
    - Prevents duplicate handlers if called multiple times

    The log level is controlled by the MYBUDDY_LOG_LEVEL environment variable.
    """
    # Get the log level from settings (defaults to INFO)
    log_level_str = settings.log_level.upper()
    try:
        log_level = getattr(logging, log_level_str)
    except AttributeError:
        # Invalid log level provided, fall back to INFO
        log_level = logging.INFO

    # Check if logging is already configured (avoid duplicate handlers)
    root_logger = logging.getLogger()
    if root_logger.handlers:
        # Already configured; just update the level
        root_logger.setLevel(log_level)
        api_logger = logging.getLogger("mybuddy.api")
        api_logger.setLevel(log_level)
        return

    # Create a stream handler for stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    # Create a formatter with timestamp, level, logger name, and message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Configure the root logger
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)

    # Configure the "mybuddy.api" logger (used by middleware)
    # Make sure it propagates to root and has the correct level
    api_logger = logging.getLogger("mybuddy.api")
    api_logger.setLevel(log_level)
    # No need to add handler separately - it will propagate to root
    api_logger.propagate = True

    # Reduce noise from third-party loggers (uvicorn, etc.)
    logging.getLogger("uvicorn.access").setLevel(log_level)
    logging.getLogger("uvicorn.error").setLevel(log_level)
