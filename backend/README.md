# FastAPI Backend Starter

Async FastAPI backend designed as a reusable base for Vite (or other SPA) frontends.

This service provides:

- **FastAPI** HTTP API with automatic OpenAPI docs
- **Async SQLModel + PostgreSQL** for typed models and CRUD
- **Keycloak JWT authentication** for securing endpoints
- **Celery + Redis** for background jobs and scheduled tasks
- **Redis pub/sub + WebSockets** for streaming job progress and real-time messaging
- **Docker Compose** stack for local development

---

## Stack Overview

**Runtime & Framework**

- Python / FastAPI (`backend.app.main:app`)
- Async SQLModel + SQLAlchemy + PostgreSQL
- Celery workers + Celery beat
- Redis for:
  - Celery broker & result backend
  - Pub/sub channels for WebSocket updates

**Auth**

- Keycloak as OpenID Connect provider
- Backend validates Bearer tokens via:
  - `KEYCLOAK_ISSUER`
  - `KEYCLOAK_AUDIENCE`
  - `KEYCLOAK_JWKS_URL` (JWKS endpoint for signing keys)

**Containers (see `docker-compose.yml`)**

- `db` – PostgreSQL database
- `redis` – Redis instance (Celery + pub/sub)
- `backend` – FastAPI application (HTTP + WebSocket)
- `worker` – Celery worker process
- `beat` – Celery beat scheduler (optional but configured)

---

## Features

### 1. Health Check

- `GET /health`
  - Simple readiness check
  - Response: `{ "status": "ok" }`

### 1b. Current User Info

- `GET /me`
  - Returns information about the current user based on the Keycloak JWT.
  - Requires a valid Bearer token.
  - Example response:
    ```json
    {
      "sub": "...",
      "username": "alice",
      "email": "alice@example.com",
      "name": "Alice Example",
      "realm_roles": ["user", "admin"],
      "client_roles": { "fastapi-backend": { "roles": ["user"] } },
      "raw_claims": { ... }
    }
    ```

### 2. Authenticated Job API (FastAPI + Celery)

These endpoints require a valid **Keycloak Bearer token**.

- `POST /jobs`
  - Enqueues a long-running Celery task (`long_running_task`).
  - The task publishes progress updates to Redis pub/sub.
  - Response: `{ "job_id": "<celery-task-id>" }`

- `GET /jobs/{job_id}`
  - Polls the Celery task by ID.
  - Response shape:
    ```json
    {
      "job_id": "...",
      "state": "PENDING|STARTED|SUCCESS|FAILURE|...",
      "result": "Job ... completed" | null
    }
    ```

### 3. Project CRUD (Async SQLModel + Postgres)

Defined in `backend/app/models.py` and `backend/app/main.py` using SQLModel.

Model:

- `Project` with:
  - `id` (int, PK)
  - `name` (str)
  - `description` (optional)
  - `created_at`, `updated_at` (timestamps)
  - `is_deleted`, `deleted_at` (soft delete)
  - `tenant_id` (optional; can be derived from token claims)

Endpoints (all require auth):

- `POST /projects` → create a project
- `GET /projects` → list projects (non-deleted)
- `GET /projects/{project_id}` → retrieve single project
- `PATCH /projects/{project_id}` → update name/description
- `DELETE /projects/{project_id}` → soft delete (idempotent)

All database access is async via `AsyncSession` + SQLModel.
Tables are auto-created on startup in development via `init_db()`; for production, you should use Alembic migrations.

### 4. WebSockets

Two WebSocket endpoints:

- `GET /ws/echo`
  - Minimal echo socket.
  - Accepts text messages and sends back `"Echo: <message>"`.

- `GET /ws/jobs/{job_id}`
  - Streams job progress for the given Celery `job_id`.
  - Subscribes to Redis channel `job_progress:<job_id>`.
  - Messages look like:
    ```json
    {
      "job_id": "...",
      "progress": 0-100,
      "step": <int>,
      "total_steps": <int>,
      "payload": { ... }
    }
    ```

This is designed for frontends (e.g. Vite/React) to show live progress bars for background jobs.

---

## Running Locally (Docker)

### Prerequisites

- Docker & Docker Compose installed
- A Keycloak realm configured with:
  - A public client for your frontend
  - A confidential/public client for this API (audience must match `KEYCLOAK_AUDIENCE`)

### Environment Configuration

Configuration is handled via environment variables (see `docker-compose.yml` and `example.env`).

**Core application variables:**

- `DATABASE_URL` – Postgres connection (asyncpg DSN), e.g.
  - `postgresql+asyncpg://postgres:postgres@db:5432/appdb`
- `REDIS_URL` – Redis connection, e.g.
  - `redis://redis:6379/0`
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` – Celery config (typically both Redis)

If you run the app *outside* Docker, `backend/app/config.py` provides sensible defaults:

- `DATABASE_URL` defaults to `postgresql+asyncpg://postgres:postgres@localhost:5432/appdb`
- `REDIS_URL` defaults to `redis://localhost:6379/0`
- `CELERY_RESULT_BACKEND` defaults to `redis://localhost:6379/1`

**Postgres bootstrap variables (Docker only):**

These are read by the `db` service in `docker-compose.yml`:

- `POSTGRES_USER` – database user to create
- `POSTGRES_PASS` – password for `POSTGRES_USER`
- `POSTGRES_DB` – database name

You can set these in an `.env` file (see `example.env`) or in your shell before running Docker.

**Keycloak variables:**

Used by the backend to validate JWTs:

- `KEYCLOAK_ISSUER` – Realm issuer URL, e.g.
  - `https://id.suknet.org/realms/suknet`
- `KEYCLOAK_AUDIENCE` – Client ID configured in Keycloak for this API
- `KEYCLOAK_JWKS_URL` – JWKS endpoint for that realm

The `docker-compose.yml` includes **sample values** for these based on one of our realms. You should override them to match your own Keycloak setup.

### Start the stack

From the project root:

```bash
docker compose up --build
```

Docker Compose will read environment variables from your shell and from an optional `.env` file. A sample configuration is provided in `example.env`; copy it to `.env` and adjust values (Postgres, Redis, Keycloak) as needed.

This will start:

- FastAPI backend on `http://localhost:8000`
- Postgres on `localhost:5432`
- Redis on `localhost:6379`
- Celery worker and beat attached to the same codebase

### API Docs

Once running, visit:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## Example Usage

### Create a Project (curl)

```bash
ACCESS_TOKEN="<your-keycloak-access-token>"

curl -X POST "http://localhost:8000/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Project",
    "description": "Example project from curl"
  }'
```

### List Projects

```bash
curl "http://localhost:8000/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Enqueue a Job and Stream Progress

1. Enqueue job:

   ```bash
   JOB=$(curl -s -X POST "http://localhost:8000/jobs" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json")

   echo "$JOB"  # {"job_id": "..."}
   ```

2. Connect a WebSocket client (e.g. in the browser or via `websocat`) to:

   ```
   ws://localhost:8000/ws/jobs/<job_id>
   ```

   You’ll receive JSON messages with progress updates until the job is complete.

---

## Frontend Integration (Vite / TypeScript)

This backend is designed to work smoothly with Vite/TypeScript frontends via OpenAPI-generated types.

### Generate Types from OpenAPI (frontend side)

In your Vite project:

1. Install generator:

   ```bash
   npm install -D openapi-typescript
   ```

2. Add script to `package.json`:

   ```json
   {
     "scripts": {
       "gen:api": "openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.ts"
     }
   }
   ```

3. Generate types:

   ```bash
   npm run gen:api
   ```

You’ll get typed `paths`/`components` you can use to build a small, typed API client.

---

## Development Notes

- **Database migrations**: for local/dev, tables are created automatically via `init_db()` on startup. For production, set up **Alembic** migrations and remove the auto-create behaviour.
- **Soft delete**: `DELETE /projects/{id}` sets `is_deleted = True` and `deleted_at` instead of hard-deleting rows.
- **Tenancy**: `tenant_id` is available on `Project` and can be populated from Keycloak token claims (e.g. `sub` or a custom claim) for multi-tenant setups.
- **Background tasks**: Celery tasks live in `backend/app/tasks.py`. `long_running_task` publishes progress to Redis for WebSocket streaming; `heartbeat` is scheduled by Celery beat.

> Note: `docker-compose.yml` ships with sample Keycloak settings (`KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, `KEYCLOAK_JWKS_URL`) pointing at one of our realms. Make sure to update these to match your own Keycloak realm and client IDs before using this in your environment.

---

## License

MIT
