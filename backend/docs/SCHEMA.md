# Schemas & Validation

This document describes how request and response schemas are defined and used in the backend.

The project uses **Pydantic v2** together with **FastAPI** and **SQLModel**. All external API shapes are expressed as Pydantic models living under `backend/app/schemas/`.

---

## Goals

- Ensure all HTTP request/response bodies are **explicitly typed**
- Decouple API shape from database models
- Keep routers small and readable
- Provide accurate OpenAPI / Swagger documentation

---

## Schema Layout

```
backend/app/schemas/
  _base.py        # Shared base model (Pydantic v2 config)
  children.py     # ChildUpsert, ChildOut
  # content.py    # (future) affirmations, flashcards, chores, etc.
  # projects.py   # (future) project schemas
```

Schemas are grouped by **domain**, not by HTTP verb.

---

## Base Schema (`_base.py`)

All schemas inherit from a shared base class:

```py
from pydantic import BaseModel, ConfigDict

class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
```

### Why this matters

- `from_attributes=True`
  - Allows FastAPI to serialize **ORM objects** (SQLModel instances)
  - Routers can safely return database objects directly

- `populate_by_name=True`
  - Enables field aliasing (useful if camelCase output is added later)

---

## Example: Child Schemas

```py
class ChildUpsert(APIModel):
    id: str | None = None
    name: str
    birthday: date | None = None
    interests: list[str] = Field(default_factory=list)
    avatar: str | None = None

class ChildOut(APIModel):
    id: str
    name: str
    birthday: date | None = None
    interests: list[str] = Field(default_factory=list)
    avatar: str | None = None
```

### Usage in routers

```py
@router.get("/children", response_model=list[ChildOut])
async def list_children(...):
    return result.scalars().all()
```

FastAPI + Pydantic will:
- Read attributes from the ORM object
- Filter fields to only those defined in `ChildOut`
- Produce clean OpenAPI documentation

---

## Guidelines

- **Do not** return raw dicts unless absolutely necessary
- **Do not** reuse SQLModel classes as response models
- Prefer explicit `*Out` schemas for responses
- Prefer explicit `*Create` / `*Upsert` schemas for input

---

## Future Extensions

Planned schema documents:

- `docs/CONTENT.md` – affirmations, flashcards, chores, activities
- `docs/PROJECTS.md` – project CRUD & tenancy
- `docs/AUTH.md` – JWT structure and Keycloak claims
- `docs/WEBSOCKETS.md` – Redis pub/sub message formats

---

## Versioning Notes

- This project uses **Pydantic v2.x** (currently 2.12.x)
- Older `orm_mode = True` patterns do **not** apply
- Always use `ConfigDict(from_attributes=True)`

---

If you add or change schemas, update this document so API shape decisions stay discoverable for future contributors.