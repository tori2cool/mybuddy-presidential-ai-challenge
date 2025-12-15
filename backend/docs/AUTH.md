# Authentication & Authorization

This document describes how authentication works in the backend, how JWTs are validated, and how user identity is applied to data access.

The backend uses **Keycloak** as the OpenID Connect provider.

---

## Overview

- Clients authenticate with Keycloak and obtain an **access token** (JWT).
- HTTP endpoints accept the token via the `Authorization: Bearer <token>` header.
- The backend validates the token against Keycloak’s **JWKS** (JSON Web Key Set).
- Identity is derived from the standard `sub` claim (no custom claims required).

---

## Keycloak Configuration

The backend expects these environment variables:

- `KEYCLOAK_ISSUER`
  - Example: `https://id.example.com/realms/myrealm`
- `KEYCLOAK_AUDIENCE`
  - Your Keycloak client ID for the API (if set, token must include this audience)
- `KEYCLOAK_JWKS_URL`
  - JWKS endpoint for the realm

> If `KEYCLOAK_AUDIENCE` or `KEYCLOAK_ISSUER` are empty, token validation will skip those checks.

---

## Token Validation Flow

Token validation is implemented in `backend/app/security.py`:

1. Fetch JWKS (cached)
2. Read the JWT header to find the `kid`
3. Find the corresponding JWK in the JWKS
4. Decode and validate with:
   - Allowed algorithms (currently `RS256` only)
   - Optional `aud` (audience) check
   - Optional `iss` (issuer) check

### JWKS caching

`get_jwks()` is decorated with `@lru_cache()`, meaning:

- The JWKS is cached for the lifetime of the process
- Key rotations in Keycloak may require a restart (or code changes to refresh periodically)

---

## HTTP Authentication

### Mechanism

- `HTTPBearer(auto_error=False)` reads the `Authorization` header.
- `get_current_user()` returns decoded claims or raises `401`.

### In routes

Any route that includes:

```py
user: dict = Depends(get_current_user)
```

is protected and requires a valid token.

---

## Identity & Ownership

### Canonical identity: `sub`

The project uses the standard Keycloak claim:

- `sub` (subject)

as the stable user identifier.

### Child ownership (`owner_sub`)

Child resources are owned by a user and scoped by:

- `Child.owner_sub == user["sub"]`

This prevents one user from accessing another user’s children.

Ownership checks are centralized in shared dependencies (see `deps.py`).

---

## Tenancy & Multi-tenant Notes

Projects may use an optional `tenant_id`:

- If a token contains a custom tenant claim in the future, it can be mapped
- Otherwise, tenancy may be derived from `sub`

Current behavior:

- `tenant_id = user.get("tenant") or user.get("sub")`

> At the moment no custom Keycloak claims are expected. If you later add a `tenant` claim, this mapping already supports it.

---

## Roles and Authorization

Tokens may contain roles in standard Keycloak claim shapes:

- Realm roles: `realm_access.roles`
- Client roles: `resource_access[client_id].roles`

Current codebase:

- Uses authentication broadly
- Uses ownership checks for child-scoped access
- Does not yet enforce role-based authorization (RBAC) on endpoints

### If adding RBAC

Recommended approach:

- Create a dependency like `require_role("admin")`
- Apply it to admin endpoints/routes only

---

## WebSocket Authentication

WebSockets are authenticated separately from HTTP.

### Pattern

- Client passes an access token via query parameter:

```
/ws/jobs/{job_id}?token=<access_token>
```

- The backend validates the token using the same decode logic (`decode_token`).

### Why query param?

Some WebSocket clients/browsers make it awkward to set arbitrary headers.

If you later need stronger controls:

- Require `Sec-WebSocket-Protocol` token passing
- Or implement a short-lived one-time WS session token created via an HTTP endpoint

---

## Security Notes & Recommendations

- **Prefer HTTPS** in all deployments (especially for WebSockets).
- Keep `KEYCLOAK_AUDIENCE` set in production to avoid accepting tokens issued for other clients.
- Consider implementing JWKS refresh logic to support key rotation without restarts.
- Avoid logging full tokens or sensitive claims.

---

## Troubleshooting

### 401: Signing key not found

- Token header `kid` is not present in cached JWKS
- Key rotation may have occurred
- Restart the backend (or implement JWKS refresh)

### 401: Invalid token: ...

Common causes:

- Incorrect `KEYCLOAK_ISSUER`
- Incorrect `KEYCLOAK_AUDIENCE`
- Token expired
- Token signed with algorithm not in `ALLOWED_ALGORITHMS`

---

If authentication behavior changes, update this document to keep expectations clear for both backend and frontend contributors.