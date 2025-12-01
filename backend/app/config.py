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

    # ---- Keycloak (this is what security.py uses) ----
    keycloak: KeycloakSettings = KeycloakSettings()


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()