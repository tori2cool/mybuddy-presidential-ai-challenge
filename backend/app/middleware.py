# middleware.py
from __future__ import annotations

import json
import logging
import time
from typing import Callable, Awaitable

from fastapi import Request, Response

from .config import settings
from .security import decode_token, AuthError

logger = logging.getLogger("mybuddy.api")
logger.setLevel(settings.log_level.upper())

async def logging_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]):
    start_time = time.perf_counter()
    method = request.method
    path = request.url.path
    query_string = request.url.query

    user_id: str | None = None
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            claims = decode_token(token)
            user_id = claims.get("sub") or claims.get("preferred_username") or claims.get("email")
        except (AuthError, Exception):
            user_id = None

    if settings.log_request_bodies and logger.isEnabledFor(logging.DEBUG):
        body_bytes = await request.body()

        async def receive() -> dict:
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request = Request(request.scope, receive)
        logger.debug(
            "HTTP request body",
            extra={
                "http.method": method,
                "http.path": path,
                "http.query": query_string,
                "user.id": user_id,
                "http.request_body": body_bytes.decode("utf-8", errors="replace"),
            },
        )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.exception(
            "Unhandled exception during request",
            extra={
                "http.method": method,
                "http.path": path,
                "http.query": query_string,
                "user.id": user_id,
                "duration_ms": duration_ms,
            },
        )
        raise

    # NOTE: capturing response bodies safely is tricky; keep it off by default
    # unless you *really* need it. Your previous approach can work, but it’s easy
    # to break streaming responses. I’d keep it disabled unless debugging.
    if settings.log_response_bodies and logger.isEnabledFor(logging.DEBUG):
        try:
            # best-effort only (works for non-streaming responses)
            body = getattr(response, "body", None)
            if isinstance(body, (bytes, bytearray)):
                logger.debug(
                    "HTTP response body",
                    extra={
                        "http.method": method,
                        "http.path": path,
                        "http.query": query_string,
                        "user.id": user_id,
                        "http.status_code": response.status_code,
                        "http.response_body": body.decode("utf-8", errors="replace"),
                    },
                )
        except Exception:
            pass

    duration_ms = (time.perf_counter() - start_time) * 1000
    status_code = response.status_code

    logger.info(
        "HTTP request completed",
        extra={
            "http.method": method,
            "http.path": path,
            "http.query": query_string,
            "user.id": user_id,
            "http.status_code": status_code,
            "duration_ms": duration_ms,
        },
    )

    if status_code >= 400 or duration_ms >= settings.log_slow_request_ms:
        logger.warning(
            "Request potential issue",
            extra={
                "http.method": method,
                "http.path": path,
                "http.query": query_string,
                "user.id": user_id,
                "http.status_code": status_code,
                "duration_ms": duration_ms,
            },
        )

    return response
