# backend/app/security.py
from functools import lru_cache

import requests
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings

auth_scheme = HTTPBearer(auto_error=False)

# Only allow specific algorithms for JWT verification
ALLOWED_ALGORITHMS = ["RS256"]


class AuthError(HTTPException):
    pass


@lru_cache()
def get_jwks():
    if not settings.keycloak.jwks_url:
        raise RuntimeError("KEYCLOAK_JWKS_URL is not configured")
    resp = requests.get(settings.keycloak.jwks_url, timeout=5)
    resp.raise_for_status()
    return resp.json()


def decode_token(token: str) -> dict:
    """
    Validate a Keycloak JWT using the JWKS endpoint.
    """
    jwks = get_jwks()
    unverified_header = jwt.get_unverified_header(token)

    key_data = None
    for k in jwks.get("keys", []):
        if k.get("kid") == unverified_header.get("kid"):
            key_data = k
            break

    if key_data is None:
        raise AuthError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signing key not found",
        )

    try:
        claims = jwt.decode(
            token,
            key_data,  # python-jose accepts JWK dict
            algorithms=ALLOWED_ALGORITHMS,
            audience=settings.keycloak.audience or None,
            issuer=settings.keycloak.issuer or None,
        )
    except JWTError as exc:
        raise AuthError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    return claims


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> dict:
    """
    FastAPI dependency that returns token claims or 401.
    """
    if credentials is None:
        raise AuthError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    claims = decode_token(token)
    return claims
