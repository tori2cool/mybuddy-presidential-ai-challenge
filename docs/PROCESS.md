# MyBuddy Development Process

> Scope: System-wide development workflow (frontend, backend, and infrastructure).

## Overview

This document describes how we work on MyBuddy as a full-stack system. It covers local development, how to approach cross-cutting changes, and conventions that keep the frontend, backend, and infrastructure aligned.

## Local Development

This section is intentionally high-level; see component READMEs for exact commands.

### Backend & Services

- Use Docker Compose to run the backend stack (FastAPI, PostgreSQL, Redis, Celery, etc.).
- See [Backend README](../backend/README.md) for environment variables, docker-compose usage, and API docs.

### Frontend

- Run the React Native + Expo app using the provided npm/yarn scripts.
- See [Frontend README](../frontend/README.md) for available scripts and Expo usage.

## Full-Stack Change Workflow

Use this checklist for any change that spans multiple layers (data models, APIs, UI).

1. **Design the change**
   - Clarify the feature or refactor.
   - Consider data models and APIs (request/response shapes, new fields, enums).
   - Check [`ARCHITECTURE.md`](./ARCHITECTURE.md) to understand existing flows and update it if design changes are significant.

2. **Backend changes**
   - Add or update FastAPI endpoints and SQLModel models.
   - Run and update database migrations if needed.
   - Keep response payloads aligned with frontend TypeScript types.
   - Add or update backend tests.
   - Update [Backend README](../backend/README.md) if setup or usage changes.

3. **Frontend changes**
   - Implement or adjust service functions under `frontend/services/*Service.ts`.
   - Update shared types in `frontend/types/models.ts` to match backend models.
   - Wire UI components/screens to call the services and render new data.
   - Add or update frontend tests.
   - Update [Frontend README](../frontend/README.md) if commands or dev flows change.

4. **Verification**
   - Run backend tests and linters.
   - Run frontend tests and linters.
   - Exercise the feature end-to-end in a local environment (backend + frontend running together).

5. **Documentation updates**
   - Update [`ARCHITECTURE.md`](./ARCHITECTURE.md) for architectural or model changes.
   - Update [`BACKEND_API.md`](./BACKEND_API.md) for external API changes.
   - Update this process or other docs under `docs/` if workflows or conventions change.

## Conventions

- **Model alignment**: Keep backend SQLModel models and frontend TypeScript types in sync (field names, types, and enums).
- **Service layer usage**: All frontend API calls should go through the services in `frontend/services/*Service.ts` rather than being called directly from components.
- **Background jobs**: Use Celery for long-running or resource-intensive tasks; expose job status via HTTP and WebSocket endpoints.
- **Configuration**: Prefer environment variables and Docker Compose for configuring backend services and infrastructure.

## Related Documents

- [Root README](../README.md)
- [Architecture](./ARCHITECTURE.md)
- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)
