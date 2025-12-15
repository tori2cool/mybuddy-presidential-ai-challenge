# Database & Data Model

This document describes how the backend models data, how SQLModel is used, and what conventions we follow for schema evolution.

The primary goals are:

- Keep database access **typed** and **async**
- Make ownership/tenancy rules explicit
- Support safe evolution via migrations

---

## Stack

- **PostgreSQL**
- **SQLModel** (ORM models + some request/response models)
- **SQLAlchemy async** via `AsyncSession`
- JSON columns use Postgres **`JSONB`**

---

## Where Models Live

- `backend/app/models.py`
  - Contains SQLModel `table=True` ORM models
  - Also contains some Pydantic-style request/response models for Projects

> As the codebase grows, request/response models should move into `backend/app/schemas/`.

---

## Mixins & Conventions

### Timestamping (`TimeStampedMixin`)

- `created_at`: set at insert time
- `updated_at`: set at insert time, and updated automatically on update

Current implementation uses `datetime.utcnow`.

**Recommendation:** consider switching to timezone-aware UTC:

- `datetime.now(timezone.utc)`

and store timestamps as UTC consistently.

### Soft Delete (`SoftDeleteMixin`)

Soft delete is implemented with:

- `is_deleted: bool`
- `deleted_at: datetime | None`

Conventions:

- Reads must filter `is_deleted == False`
- Deletes should be idempotent (deleting an already-deleted row returns 204)
- Hard deletes should be avoided unless explicitly required

### Tenancy (`TenantMixin`)

Optional multi-tenant support:

- `tenant_id: str | None`

Current behavior derives tenant from JWT claims:

- `tenant_id = claims.get("tenant") or claims.get("sub")`

No custom claims are required today; `sub` is sufficient.

---

## Core Tables

### `children`

Child profiles used as the root for personalization.

Fields:

- `id` (PK, string)
- `owner_sub` (Keycloak subject; scopes access)
- `name` (required)
- `birthday` (optional)
- `interests` (`JSONB`, list of strings)
- `avatar` (optional)
- `created_at`, `updated_at`

Notes:

- `owner_sub` is the authorization boundary for child-scoped APIs
- `interests` should be treated as **always a list** (avoid NULL)

### `affirmations`

Static affirmation content.

- `id` (PK)
- `text`
- `gradient_0`, `gradient_1`

### `subjects`

Academic subjects for organizing flashcards.

- `id` (PK)
- `name`, `icon`, `color`

### `flashcards`

Flashcard content linked to a subject.

- `id` (PK)
- `subject_id` (FK → `subjects.id`)
- `question`, `answer`
- `acceptable_answers` (`JSONB`, list)
- `difficulty` (string)

Notes:

- `difficulty` is enforced at the application layer (`easy|medium|hard`).
- A DB-level CHECK constraint can be added when migrations (Alembic) are introduced.

### `chores`

Chore templates.

- `id` (PK)
- `label`, `icon`
- `is_extra` (bool)

### `outdoor_activities`

Outdoor activity options.

- `id` (PK)
- `name`, `category`, `icon`, `time`
- `points` (int)
- `is_daily` (bool)

---

## Project Models

Projects are an example of a more “app-like” domain model.

### Tables / Models

- `Project` (`table=True`)
  - Inherits `TimeStampedMixin`, `SoftDeleteMixin`, `TenantMixin`
  - `id` is an integer primary key

### Request/Response models

Currently, `ProjectCreate`, `ProjectRead`, `ProjectUpdate` are defined in `models.py`.

**Recommendation:** move these to `schemas/projects.py` over time so:

- SQLModel ORM models stay “DB-only”
- API shapes are kept under `schemas/`

---

## Async Query Patterns

### Prefer explicit `select()` queries

```py
stmt = select(Child).where(Child.owner_sub == owner_sub)
result = await session.execute(stmt)
rows = result.scalars().all()
```

### Ownership checks

Child-scoped queries must include both:

- `Child.id == child_id`
- `Child.owner_sub == owner_sub`

This is centralized via the `get_child_owned` dependency.

---

## Migrations & Schema Evolution

### Current behavior

- Tables may be auto-created on startup in development (`init_db()`)

### Production recommendation

- Use Alembic migrations
- Disable auto-create in production

### Existing raw migrations

This repo includes raw SQL migrations in `backend/migrations/`.

If you are installing fresh and need `children.owner_sub NOT NULL`, apply:

- `2025-12-14_add_owner_sub_to_children.sql`
- `2025-12-14_owner_sub_not_null.sql` (after any backfill)

---

## Indexing Guidelines

- Add indexes for common filters:
  - `children.owner_sub`
  - `children.is_deleted` (if soft delete added later)
  - `projects.tenant_id`
  - `projects.is_deleted`

- For JSONB fields (`interests`, `acceptable_answers`):
  - Only add GIN indexes if you start querying inside JSON frequently

---

## Data Integrity Recommendations

As migrations mature, consider adding:

- NOT NULL constraints for required fields (`name`, etc.)
- CHECK constraints (e.g. `difficulty IN (...)`)
- Foreign keys where appropriate (already used for `flashcards.subject_id`)

---

If model structure or migration strategy changes, update this document so schema decisions remain discoverable.