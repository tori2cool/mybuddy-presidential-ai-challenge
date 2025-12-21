# MyBuddy Architecture

> Scope: System-wide architecture (frontend, backend, and supporting infrastructure).

This document describes the overall architecture of MyBuddy, including how the frontend (React Native + Expo), backend (FastAPI + PostgreSQL + Celery), and infrastructure (Docker, Redis, Keycloak) fit together. It is the canonical reference for shared data models, services, and data flows across the system.

## Components

### Frontend

- React Native + Expo mobile application (MyBuddy)
- Navigation, theming, and feature screens (Affirmations, Flashcards, Outdoor, Chores, Profile)
- Service layer in `frontend/services/*Service.ts`
- Shared types in `frontend/types/models.ts`

### Backend

- FastAPI application (see `backend/README.md`)
- SQLModel models and CRUD endpoints
- Celery workers for background tasks
- WebSocket endpoints for real-time updates

### Infrastructure

- Docker Compose for local development
- PostgreSQL database for persistent storage
- Redis for caching, Celery broker, and pub/sub
- Keycloak for authentication and JWT issuance

## Data Models and Alignment

Shared domain concepts are represented in both the backend (SQLModel/Pydantic schemas exposed via FastAPI and documented in OpenAPI) and the frontend (TypeScript types and service-layer mappings).

**Backend is the source of truth** for domain models and API contracts.

- **Canonical definitions:** Backend SQLModel/Pydantic schemas (and the generated **OpenAPI** spec) are canonical for field names, types, validation, and API request/response shapes.
- **Propagate backend changes:** When backend models/schemas change, update the corresponding frontend TypeScript types in `frontend/types/models.ts` **and** update any affected frontend service-layer code (e.g., `frontend/services/*Service.ts`) that maps API JSON into app models.
- **Keep enums/unions aligned:** Keep backend enums and frontend string unions (e.g., `DifficultyTier`, `SubjectId`) synchronized.
- **Prefer generation when possible:** Prefer generating TypeScript types from OpenAPI when feasible, to reduce drift.
- **Coordinate changes:** Coordinate model and contract changes across backend + frontend and avoid unannounced breaking changes.

### Example: Flashcards

- Backend (canonical): `Flashcard` SQLModel/Pydantic schema and its FastAPI endpoint responses (documented in OpenAPI) with fields like `id`, `question`, `answer`, `difficulty`, `subject_id`.
- Frontend: `Flashcard` interface (and related types) in `frontend/types/models.ts` aligned to the backend schema; frontend services map API JSON to these types.


## Data Flows

This section outlines common end-to-end flows through the system.

### Example: Loading Flashcards

1. The user opens the **Flashcards** screen in the MyBuddy app.
2. The screen calls a frontend service in `frontend/services/flashcardsService.ts`.
3. The service issues an HTTP request to the backend (FastAPI) endpoint (see `docs/BACKEND_API.md`).
4. The backend queries PostgreSQL for the matching flashcards and returns JSON.
5. The frontend service maps the JSON into `Flashcard` TypeScript types.
6. The UI renders the list of flashcards and updates progress via local state/context.

### Example: Background Job with WebSocket Updates

1. Frontend calls a backend HTTP endpoint that enqueues a Celery job.
2. Backend responds with a `job_id`.
3. Frontend opens a WebSocket connection to `/ws/jobs/{job_id}`.
4. Celery task publishes progress to Redis; backend relays updates over WebSocket.
5. Frontend updates progress indicators in real time.

## Related Documents

- [Root README](../README.md)
- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)
- [PROCESS](./PROCESS.md)
