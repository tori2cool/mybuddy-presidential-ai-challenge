# Database Schema (Content-Only, First Pass)

This document describes a **content-centric** database schema for the current app. It focuses only on shared content that is surfaced through the front-end services and backend HTTP API.

> **Out of scope for this pass:** user accounts, progress tracking, or any per-user tables.

Canonical type definitions live in `types/models.ts`. Backend HTTP contracts live in [`BACKEND_API.md`](./BACKEND_API.md).

---

## 1. Design Goals

- Mirror existing front-end models (`Affirmation`, `Flashcard`, `Subject`, `Chore`, `OutdoorActivity`).
- Stay compatible with the first-pass backend API in `BACKEND_API.md`.
- Keep things simple: no multi-tenancy, no localization, no user-specific overrides.

All tables use a string primary key for consistency with the current TypeScript models.

---

## 2. Tables Overview

- `affirmations`
- `subjects`
- `flashcards`
- `chores`
- `outdoor_activities`

---

## 3. `affirmations`

Represents reusable affirmation content for the Affirmations screen.

**Columns**

| Column        | Type        | Constraints         | Notes                                         |
| ------------- | ----------- | ------------------- | --------------------------------------------- |
| `id`          | `varchar`   | PK                  | Matches `Affirmation.id` in the frontend.     |
| `text`        | `text`      | NOT NULL            | `Affirmation.text`.                           |
| `gradient_0`  | `varchar`   | NOT NULL            | First color stop of the gradient.             |
| `gradient_1`  | `varchar`   | NOT NULL            | Second color stop of the gradient.            |

**Model mapping**

- Frontend: `Affirmation` (`types/models.ts`).
- API: `GET /v1/affirmations` returns a `gradient: [string, string]` array composed from `gradient_0` and `gradient_1`.

---

## 4. `subjects`

Defines academic subjects used to organize flashcards and other content.

**Columns**

| Column   | Type      | Constraints | Notes                                         |
| -------- | --------- | ----------- | --------------------------------------------- |
| `id`     | `varchar` | PK          | Matches `SubjectId` union and `Subject.id`.   |
| `name`   | `varchar` | NOT NULL    | User-facing label (`Subject.name`).           |
| `icon`   | `varchar` | NOT NULL    | Icon name (`Subject.icon`).                   |
| `color`  | `varchar` | NOT NULL    | Hex color string (`Subject.color`).           |

**Model mapping**

- Frontend: `Subject`, `SubjectId`.
- API: `GET /v1/subjects`.

---

## 5. `flashcards`

Stores individual flashcards, each linked to a subject.

**Columns**

| Column               | Type        | Constraints                      | Notes                                                       |
| -------------------- | ----------- | -------------------------------- | ----------------------------------------------------------- |
| `id`                 | `varchar`   | PK                               | Unique per-row key (`Flashcard.id`).                        |
| `subject_id`         | `varchar`   | NOT NULL, FK → `subjects.id`     | Links to the owning subject (`SubjectId`).                  |
| `question`           | `text`      | NOT NULL                         | `Flashcard.question`.                                      |
| `answer`             | `text`      | NOT NULL                         | `Flashcard.answer`.                                        |
| `acceptable_answers` | `jsonb`     | NOT NULL, default `[]`           | JSON array of strings (`Flashcard.acceptableAnswers`).      |
| `difficulty`         | `varchar`   | NOT NULL, check in (`easy`, `medium`, `hard`) | Mirrors `DifficultyTier`.                |

**Indexes**

- `idx_flashcards_subject_difficulty` on (`subject_id`, `difficulty`) to support `GET /v1/flashcards?subjectId=&difficulty=`.

**Model mapping**

- Frontend: `Flashcard`, `DifficultyTier`, `SubjectId`.
- API: `GET /v1/flashcards`.

---

## 6. `chores`

Represents chore templates used by the Chores screen.

**Columns**

| Column     | Type        | Constraints | Notes                                             |
| ---------- | ----------- | ----------- | ------------------------------------------------- |
| `id`       | `varchar`   | PK          | `Chore.id`.                                      |
| `label`    | `varchar`   | NOT NULL    | `Chore.label`.                                   |
| `icon`     | `varchar`   | NOT NULL    | `Chore.icon` (e.g., `home`, `user`).             |
| `is_extra` | `boolean`   | NOT NULL DEFAULT FALSE | Maps to optional `Chore.isExtra`.      |

**Model mapping**

- Frontend: `Chore`.
- API: `GET /v1/chores/daily` can select from this table based on server-side logic (e.g., by day or randomization).

---

## 7. `outdoor_activities`

Defines outdoor activity options for the Outdoor screen.

**Columns**

| Column     | Type        | Constraints | Notes                                        |
| ---------- | ----------- | ----------- | -------------------------------------------- |
| `id`       | `varchar`   | PK          | `OutdoorActivity.id`.                        |
| `name`     | `varchar`   | NOT NULL    | `OutdoorActivity.name`.                      |
| `category` | `varchar`   | NOT NULL    | Broad label (`OutdoorActivity.category`).    |
| `icon`     | `varchar`   | NOT NULL    | Icon name (`OutdoorActivity.icon`).          |
| `time`     | `varchar`   | NOT NULL    | Human-readable (e.g., "15 min").            |
| `points`   | `integer`   | NOT NULL    | Gamification points (`OutdoorActivity.points`). |
| `is_daily` | `boolean`   | NOT NULL    | `OutdoorActivity.isDaily`.                   |

**Model mapping**

- Frontend: `OutdoorActivity`.
- API: `GET /v1/outdoor/activities` (optionally filtered by `isDaily`).

---

## 8. How This Schema Connects the App

- **Frontend models → DB tables:**
  - `Affirmation` → `affirmations`
  - `Subject` / `SubjectId` → `subjects`
  - `Flashcard` → `flashcards`
  - `Chore` → `chores`
  - `OutdoorActivity` → `outdoor_activities`
- **Backend API → DB:**
  - `GET /v1/affirmations` reads from `affirmations`.
  - `GET /v1/subjects` reads from `subjects`.
  - `GET /v1/flashcards` reads from `flashcards` (filtered by `subject_id` and `difficulty`).
  - `GET /v1/chores/daily` selects a subset from `chores`.
  - `GET /v1/outdoor/activities` reads from `outdoor_activities` (optionally filtered by `is_daily`).

This file is the **canonical reference for persistent storage of shared content**. For user-specific state and progress, a separate schema doc will be introduced in a later phase.
