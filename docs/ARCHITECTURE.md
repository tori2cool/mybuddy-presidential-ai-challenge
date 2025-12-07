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

Shared domain concepts are represented both in the backend (SQLModel models) and in the frontend (TypeScript types in `frontend/types/models.ts`).

- Ensure that field names and types stay aligned between backend models and frontend types.
- When you add or change a model in the backend, update the corresponding TypeScript type.
- Keep enums / string unions (e.g., `DifficultyTier`, `SubjectId`) synchronized.

### Example: Flashcards

- Backend: `Flashcard` SQLModel with fields like `id`, `question`, `answer`, `difficulty`, `subject_id`.
- Frontend: `Flashcard` interface in `frontend/types/models.ts` with the same fields.

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
