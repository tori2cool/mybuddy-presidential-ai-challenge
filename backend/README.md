# FastAPI Backend Starter

Async FastAPI backend designed as a reusable base for Vite (or other SPA) frontends.

This service provides:

- **FastAPI** HTTP + WebSocket API with automatic OpenAPI docs
- **Async SQLModel + PostgreSQL** for typed models and CRUD
- **Pydantic v2 schemas** for clean request/response validation
- **Keycloak JWT authentication** for securing endpoints
- **Celery + Redis** for background jobs and scheduled tasks
- **Redis pub/sub + WebSockets** for streaming job progress and real-time messaging
- **Docker Compose** stack for local development

---

## Stack Overview

**Runtime & Framework**

- Python 3.11+
- FastAPI (`app/main.py`) (serve with `uvicorn app.main:app`)
- Pydantic **v2.x** (response/request schemas)
- SQLModel + SQLAlchemy (async)
- PostgreSQL

**Async / Background**

- Celery worker + beat
- Redis for:
  - Celery broker & result backend
  - Pub/sub channels for WebSocket updates

**Auth**

- Keycloak as OpenID Connect provider
- Backend validates Bearer tokens via:
  - `KEYCLOAK_ISSUER`
  - `KEYCLOAK_AUDIENCE`
  - `KEYCLOAK_JWKS_URL`

---

## Project Structure

```
app/
  main.py                 # App creation & router wiring
  middleware.py           # Structured request logging
  deps.py                 # Shared FastAPI dependencies
  config.py               # Environment-based configuration
  db.py                   # Async engine & session
  models.py               # SQLModel ORM models
  tasks.py                # Celery tasks

  routers/
    core.py               # /me, /jobs, /projects (v1 + legacy)
    content.py            # /v1 children & educational content APIs
    ws.py                 # WebSocket endpoints

  schemas/
    _base.py              # Pydantic v2 base (from_attributes enabled)
    children.py           # ChildUpsert / ChildOut
    # (future: content.py, projects.py, etc.)
```

**Design goals:**
- `main.py` is *wiring only*
- Business logic lives in routers
- Reusable validation lives in `deps.py`
- All HTTP responses are typed via Pydantic schemas

---

## Features

### 1. Health Check

- `GET /health`
  - Simple readiness check
  - Response: `{ "status": "ok" }`

---

### 2. Current User Info

- `GET /v1/me`
- `GET /me` (deprecated)

Returns information about the current user based on the Keycloak JWT.

Example response:
```json
{
  "sub": "...",
  "username": "alice",
  "email": "alice@example.com",
  "name": "Alice Example",
  "realm_roles": ["user", "admin"],
  "client_roles": { "fastapi-backend": { "roles": ["user"] } }
}
```

---

### 3. Children API (Personalized Content Root)

Defined in `routers/content.py` using **Pydantic v2 schemas**.

All endpoints require authentication and are scoped to the current user (`owner_sub`).

#### List children

- `GET /v1/children`

```json
[
  {
    "id": "abc123",
    "name": "Sam",
    "birthday": "2018-04-10",
    "interests": ["space", "dinosaurs"],
    "avatar": "astronaut"
  }
]
```

#### Create or update a child

- `POST /v1/children`

Rules:
- If `id` is provided: update or create (if owned by caller)
- If `id` is omitted: create a new child with generated ID

```json
{
  "name": "Sam",
  "birthday": "2018-04-10",
  "interests": ["space", "dinosaurs"]
}
```

#### Get a single child

- `GET /v1/children/{child_id}`

---

### 4. Educational & Activity Content APIs

All content endpoints require a valid `childId` query parameter and validate ownership via a shared dependency.

Examples:

- `GET /v1/affirmations?childId=...`
- `GET /v1/subjects?childId=...`
- `GET /v1/flashcards?subjectId=...&difficulty=easy&childId=...`
- `GET /v1/chores/daily?childId=...`
- `GET /v1/outdoor/activities?childId=...&isDaily=true`

These are designed to be **child-aware** so future personalization (age, interests, progress) can be layered in without API changes.

---

### 5. Authenticated Job API (FastAPI + Celery)

- `POST /v1/jobs`
- `GET /v1/jobs/{job_id}`

Legacy aliases (`/jobs`) are kept but marked **deprecated**.

Jobs are executed by Celery workers and publish progress events to Redis.

---

### 6. Project CRUD (Async SQLModel + Postgres)

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/{id}`
- `PATCH /v1/projects/{id}`
- `DELETE /v1/projects/{id}` (soft delete)

Features:
- Async DB access via `AsyncSession`
- Soft delete (`is_deleted`, `deleted_at`)
- Optional multi-tenancy via `tenant_id` derived from token claims

---

### 7. WebSockets

Defined in `routers/ws.py`.

- `GET /ws/echo`
  - Simple echo socket for testing

- `GET /ws/jobs/{job_id}?token=...`
  - Streams job progress via Redis pub/sub
  - Channel: `job_progress:{job_id}`

Example message:
```json
{
  "job_id": "...",
  "progress": 40,
  "step": 2,
  "total_steps": 5,
  "payload": { "message": "Processing" }
}
```

---

## Running Locally (Docker)

### Prerequisites

- Docker & Docker Compose
- Keycloak realm with:
  - A frontend client
  - An API client matching `KEYCLOAK_AUDIENCE`

### Start the stack

```bash
docker compose up --build  # from within ./backend
```

Services started:

- FastAPI backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Celery worker + beat

---

## API Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## Frontend Integration (Vite / TypeScript)

The API is fully typed via OpenAPI and works well with `openapi-typescript`.

```bash
npm install -D openapi-typescript
```

```bash
openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.ts
```

---

## Development Notes

- **Pydantic v2** is used; schemas rely on `from_attributes=True`
- **Auto table creation** is enabled for dev via `init_db()`
- Use **Alembic** migrations for production
- Shared dependencies (e.g. child ownership validation) live in `deps.py`
- Legacy routes are preserved but marked `deprecated=True`

### Recreating the DB schema (no migrations)

This repo currently assumes you can **drop & recreate** the dev database when schema changes.

If you change column types (e.g. switching timestamp columns to `timestamptz` / timezone-aware UTC), recreate:

```bash
# from ./backend
docker compose down
# WARNING: this deletes Postgres data volume
docker compose down -v
docker compose up --build
```

---

## License

MIT
