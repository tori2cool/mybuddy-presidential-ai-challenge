# backend/app/config.py
import os
from functools import lru_cache
from pydantic import BaseModel


class KeycloakSettings(BaseModel):
    """
    Keycloak-specific configuration.

    Values come from environment variables:
      - KEYCLOAK_ISSUER
      - KEYCLOAK_AUDIENCE
      - KEYCLOAK_JWKS_URL
    """
    issuer: str = os.getenv("KEYCLOAK_ISSUER", "")
    audience: str = os.getenv("KEYCLOAK_AUDIENCE", "")
    jwks_url: str = os.getenv("KEYCLOAK_JWKS_URL", "")


class Settings(BaseModel):
    """
    Application-level configuration.
    """

    # ---- Logging ----
    # Log level for application logs (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    log_level: str = os.getenv("MYBUDDY_LOG_LEVEL", "INFO")
    # Threshold in milliseconds after which a request is considered "slow"
    log_slow_request_ms: int = int(os.getenv("MYBUDDY_LOG_SLOW_REQUEST_MS", "500"))
    # Whether to log full HTTP request bodies at DEBUG level
    log_request_bodies: bool = os.getenv("MYBUDDY_LOG_REQUEST_BODIES", "false").lower() in {"1", "true", "yes"}
    # Whether to log full HTTP response bodies at DEBUG level
    log_response_bodies: bool = os.getenv("MYBUDDY_LOG_RESPONSE_BODIES", "false").lower() in {"1", "true", "yes"}

    # ---- Database ----
    # Async SQLAlchemy URL (adjust to your DB/users/host as needed)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/appdb",
    )

    # ---- Redis / Celery ----
    # Base Redis connection (for pub/sub, etc.)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Celery broker and backend (defaulting to Redis)
    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", redis_url)
    celery_result_backend: str = os.getenv(
        "CELERY_RESULT_BACKEND",
        "redis://localhost:6379/1",
    )

    # If we generate images from backend, this is the base URL for them
    backend_img_url: str = os.getenv("BACKEND_IMG_URL")

    # ---- Content Expansion ----
    # Maximum auto-generated flashcards per subject/age/difficulty combination
    max_auto_flashcards: int = int(os.getenv("MAX_AUTO_FLASHCARDS", "500"))

    # Dedupe bucket size (minutes) for content expansion request idempotency.
    #
    # - Default: 60 (i.e., max 1 request/hour per context).
    # - If set to 0 (or < 1): disable time-bucket dedupe by using a unique
    #   suffix in the dedupe_key for each request.
    # - Capped to 1440 (24h) to avoid unexpectedly huge buckets.
    content_expansion_dedupe_bucket_minutes: int = min(
        max(int(os.getenv("CONTENT_EXPANSION_DEDUPE_BUCKET_MINUTES", "60")), 0),
        24 * 60,
    )

    # ---- AI / Content Generation ----
    # OpenAI API key for flashcard generation
    #
    # NOTE: Support both naming schemes for backward compatibility.
    # Prefer the docker-compose style (with underscore between FLASH and CARD).
    flashcard_api_key: str = os.getenv("FLASHCARD_API_KEY", os.getenv("FLASHCARD_API_KEY", ""))
    # OpenAI API base URL
    flashcard_api_base: str = os.getenv(
        "FLASHCARD_API_BASE",
        os.getenv("FLASHCARD_API_BASE", None),
    )
    # Model to use for flashcard generation
    flashcard_model: str = os.getenv(
        "FLASHCARD_API_MODEL",
        os.getenv("FLASHCARD_MODEL", "gpt-5-mini"),
    )

    # ---- Topic helper / topic catalog ----
    # Model to use for topic helper; if unset, fall back to flashcard_model.
    topic_helper_model: str | None = os.getenv("TOPIC_HELPER_MODEL", None)
    # Version namespace for topic catalog keys / behavior.
    topic_catalog_version: str = os.getenv("TOPIC_CATALOG_VERSION", "v1")
    # Rotation bucket for caching topic catalogs: static|daily|weekly|monthly
    topic_catalog_rotate: str = os.getenv("TOPIC_CATALOG_ROTATE", "weekly")
    topic_catalog_count: int = int(os.getenv("TOPIC_CATALOG_COUNT", "30"))
    # TTL for cached catalog in Redis (seconds). If unset/empty, store without TTL.
    _topic_catalog_ttl_seconds_raw: str = os.getenv("TOPIC_CATALOG_TTL_SECONDS", "")
    topic_catalog_ttl_seconds: int | None = (
        int(_topic_catalog_ttl_seconds_raw) if _topic_catalog_ttl_seconds_raw.strip() else None
    )
    # How many topics to pass into the flashcard prompt for one batch.
    topic_pool_size: int = int(os.getenv("TOPIC_POOL_SIZE", "12"))

    # ---- Keycloak (this is what security.py uses) ----
    keycloak: KeycloakSettings = KeycloakSettings()


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()