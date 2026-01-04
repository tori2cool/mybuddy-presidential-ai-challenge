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

    duration_ms = (time.perf_counter() - start_time) * 1000
    status_code = response.status_code

    # Log response body if enabled
    if settings.log_response_bodies and logger.isEnabledFor(logging.DEBUG):
        try:
            # Get response body if available
            body = None
            if hasattr(response, "body"):
                body = getattr(response, "body")
            elif hasattr(response, "_body"):
                body = getattr(response, "_body")
            
            if body is not None:
                # Convert to string safely
                if isinstance(body, (bytes, bytearray)):
                    body_str = body.decode("utf-8", errors="replace")
                elif isinstance(body, (list, dict, str)):
                    body_str = str(body)
                else:
                    body_str = f"<{type(body).__name__}>"
                
                # Truncate long bodies
                body_truncated = body_str[:1000] if len(body_str) > 1000 else body_str
                
                logger.debug(
                    "HTTP response body",
                    extra={
                        "http.method": method,
                        "http.path": path,
                        "http.query": query_string,
                        "user.id": user_id,
                        "http.status_code": status_code,
                        "http.response_body": body_truncated,
                        "http.response_type": type(body).__name__,
                        "http.response_length": len(body) if hasattr(body, "__len__") else None,
                    },
                )
        except Exception as e:
            logger.debug(f"Could not log response body: {e}")

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
