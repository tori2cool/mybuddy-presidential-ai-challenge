# MyBuddy (Full Stack)

This repository contains the full stack for **MyBuddy**, a cross‑platform mobile application with a React Native + Expo frontend and a FastAPI + PostgreSQL backend. It is designed to be developed and deployed as a cohesive system, while keeping the frontend and backend logically separated.

This README gives a **high‑level overview** of the system and links to more detailed documentation in each area.

---

## 1. High‑Level Architecture

**Frontend**

- **Framework:** React Native + Expo
- **Language:** TypeScript
- **Responsibilities:**
  - Mobile UI (iOS and Android)
  - Client‑side navigation and state management
  - Communicating with the backend through domain‑specific service modules
- **Key concepts:**
  - Shared data models in `types/models.ts`
  - Service layer in `services/*Service.ts` (e.g. `OutdoorService`, `ChoresService`, `FlashcardsService`, `AffirmationsService`)
  - Clear separation between UI components and data access

**Backend**

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL via async **SQLModel**
- **Auth:** Keycloak JWT authentication
- **Background jobs:** Celery (with Redis as broker)
- **Real‑time:** WebSockets (e.g. for job progress and echo endpoints)
- **Responsibilities:**
  - HTTP API (OpenAPI/Swagger docs)
  - Data persistence & domain logic
  - Background and scheduled tasks
  - Real‑time messaging

**Infrastructure & runtime**

- **Docker Compose** defines services for:
  - `db` (PostgreSQL)
  - `redis`
  - `backend` (FastAPI app via Uvicorn)
  - `worker` (Celery worker)
  - `beat` (Celery beat/scheduler)
- Local development is typically done via Docker, with frontend run via Expo tooling.

For a deeper explanation of the architecture and design decisions, see:

- `docs/ARCHITECTURE.md` (overall architecture and service layer)
- `backend/README.md` (backend‑specific details)
- `frontend/README.md` (frontend‑specific details)

---

## 2. Repository Structure

At a glance:

```text
.
├─ backend/            # FastAPI backend (API, models, DB, Celery, WebSockets)
│  ├─ app/             # FastAPI app code (routers, models, services)
│  ├─ tests/           # Backend tests (if present)
│  └─ README.md        # Backend usage & architecture details
│
├─ frontend/           # React Native + Expo mobile app
│  ├─ app/ or src/     # Main application source (screens, components)
│  ├─ services/        # Domain services for API access and data shaping
│  ├─ types/           # Shared TypeScript types/models
│  └─ README.md        # Frontend usage, scripts, and dev workflow
│
├─ docs/               # Project‑wide documentation
│  └─ ARCHITECTURE.md  # Canonical architecture & data model reference
│
├─ docker-compose.yml  # Multi‑service local runtime (db, redis, backend, worker, beat)
└─ README.md           # This file (full‑stack overview & doc index)
```

> Note: Exact subpaths in `frontend/` and `backend/` may evolve; refer to the respective READMEs for current details.

---

## 3. Frontend Overview

The frontend is a React Native application built with Expo and TypeScript.

**Key points**

- Entrypoint: the Expo/React Native app entry file (e.g. `index.js`).
- Uses a **service layer** to talk to the backend:
  - `services/OutdoorService.ts`
  - `services/ChoresService.ts`
  - `services/FlashcardsService.ts`
  - `services/AffirmationsService.ts`
- UI components/screens do **not** call the backend directly; they depend on these services and shared models from `types/models.ts`.

**More info**

- See `frontend/README.md` for:
  - How to run the frontend (Expo commands, dev scripts)
  - Project structure within `frontend/`
  - Linting/formatting (ESLint, Prettier)
  - Any platform‑specific notes

---

## 4. Backend Overview

The backend is a FastAPI application that provides:

- RESTful HTTP APIs with OpenAPI documentation
- Persistence with PostgreSQL and async SQLModel
- Auth using Keycloak (JWT)
- Background tasks via Celery and Redis
- WebSockets for real‑time communication

**Entrypoint**

- Application module: `backend.app.main:app`
- Typically served with Uvicorn (e.g. via Docker Compose).

**Features (non‑exhaustive)**

- Health check endpoints
- User info endpoints (using JWT)
- Project CRUD (with soft delete behaviour)
- Authenticated job APIs that use Celery for long‑running tasks
- WebSocket endpoints for:
  - Echo
  - Streaming job progress and other real‑time events

**More info**

- See `backend/README.md` for:
  - Detailed API description and routes
  - Local development instructions (including required environment variables)
  - Celery / Redis / WebSocket behaviour
  - Database and migrations

---

## 5. Architecture & Design Documentation

The canonical reference for how data and services are structured is:

- **`docs/ARCHITECTURE.md`**

It covers:

- The internal service layer (backend and frontend)
- Shared data models and how they map to database tables
- Relationships between domain concepts (e.g. projects, jobs, etc.)
- Guidelines for adding or refactoring services, models, or DB mappings

When adding new services, changing models, or altering persistence behaviour, update `docs/ARCHITECTURE.md` accordingly.

Other useful docs (if present):

- `frontend/docs/PROCESS.md` – frontend development process and workflow
- Additional `docs/*.md` – feature‑specific or process documentation

---

## 6. Running the Application (Quick Orientation)

**Full stack (high level)**

1. Bring up backend infrastructure with Docker Compose (database, Redis, backend API, Celery worker/beat).
2. Run the frontend with Expo (usually in development mode, connecting to the backend API).

> Exact commands, environment variables, and setup steps are intentionally **kept in the component READMEs**, so this file stays high‑level and doesn’t drift.

- For backend: see `backend/README.md` (“Running locally”, “Environment variables”, etc.).
- For frontend: see `frontend/README.md` (“Getting started”, “Development scripts”).

---

## 7. Contributing & Making Changes

When you:

- Add or change API endpoints
- Modify data models or database schema
- Introduce or refactor domain services
- Change how the frontend consumes data

Please:

1. Update **backend logic and tests** as needed.
2. Update **frontend services/types** to stay in sync.
3. Update documentation:
   - `docs/ARCHITECTURE.md` (if models/services change)
   - `backend/README.md` or `frontend/README.md` (if usage or workflows change)
   - This `README.md` (if repository structure or top‑level concepts change)

Keeping this README and the linked docs current is what makes onboarding and future changes easier.

---

## 8. Where to Look Next

- **New to the project?**
  - Start with this file.
  - Then read:
    - `docs/ARCHITECTURE.md`
    - `backend/README.md`
    - `frontend/README.md`

- **Working on frontend features?**
  - Go to `frontend/README.md`
  - Check `frontend/services/` and `frontend/types/`

- **Working on backend or data models?**
  - Go to `backend/README.md`
  - Check `docs/ARCHITECTURE.md` for model/service alignment
