# Routers & API Structure

This document explains how HTTP and WebSocket routes are organized, versioned, and extended in the backend.

The goal is to keep the API predictable, maintainable, and safe to evolve over time.

---

## Design Principles

- **`main.py` does wiring only**
- Routers own business logic
- Versioning is explicit (`/v1/...`)
- Legacy routes may exist but are clearly marked deprecated
- Shared validation logic lives in dependencies, not routers

---

## Router Layout

```
backend/app/routers/
  core.py      # Authenticated core APIs (me, jobs, projects)
  content.py   # Child-scoped educational & activity content
  ws.py        # WebSocket endpoints
```

Each router is responsible for a *cohesive domain*.

---

## `core.py`

Purpose:
- Cross-cutting application APIs
- Not tied to a specific child or content domain

Contains:

- `/v1/me` (and legacy `/me`)
- `/v1/jobs`, `/v1/jobs/{job_id}` (Celery integration)
- `/v1/projects` CRUD (multi-tenant, soft delete)

Characteristics:
- Requires authentication
- Uses JWT claims for identity and tenancy
- Supports legacy aliases marked `deprecated=True`

---

## `content.py`

Purpose:
- All **child-scoped** content APIs
- Educational, activity, and personalization roots

Contains:

- `/v1/children`
- `/v1/affirmations`
- `/v1/subjects`
- `/v1/flashcards`
- `/v1/chores/daily`
- `/v1/outdoor/activities`

Rules:

- Most endpoints require a valid `childId` query parameter
- Child ownership is validated via a shared dependency
- Future personalization logic (age, interests, progress) belongs here

---

## `ws.py`

Purpose:
- Real-time streaming APIs

Contains:

- `/ws/echo`
- `/ws/jobs/{job_id}`

Notes:
- WebSockets are authenticated using a JWT token passed as a query parameter
- Job updates are streamed via Redis pub/sub channels

---

## API Versioning

### Canonical routes

- All new APIs **must** be created under `/v1/...`
- `/v1` represents the stable contract for clients

### Legacy routes

- Older routes may exist without the `/v1` prefix
- These routes:
  - Are thin wrappers around the canonical implementation
  - Are marked `deprecated=True`
  - Should not receive new features

Example:

```py
@router.get("/v1/me")
async def me_v1(...):
    ...

@router.get("/me", deprecated=True)
async def me_legacy(...):
    return await me_v1(...)
```

---

## Dependencies vs Routers

### Rule of thumb

- **Routers** orchestrate behavior
- **Dependencies** enforce rules

Examples of dependency responsibilities:

- Validate JWT and extract user
- Validate child ownership
- Inject database sessions

Example:

```py
child: Child = Depends(get_child_owned)
```

This keeps route handlers small and readable.

---

## Adding a New Route (Checklist)

When adding a new API endpoint:

1. Decide the domain (`core`, `content`, or new router)
2. Add it under `/v1/...`
3. Use a Pydantic response schema
4. Reuse existing dependencies where possible
5. Document behavior if it introduces new concepts

---

## Future Extensions

If the API surface grows significantly, consider:

- `admin.py` router for privileged operations
- `metrics.py` router for internal observability
- Versioned routers (`routers/v2/`) when breaking changes are unavoidable

---

This document should be updated whenever routing or versioning conventions change.
