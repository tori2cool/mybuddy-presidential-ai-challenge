# Backend API (First-Pass Design)

This document defines a **first-pass backend HTTP API** based on the current front-end service layer:

- `affirmationsService`
- `flashcardsService`
- `choresService`
- `outdoorService`
- `subjectsService`

It is intentionally minimal and mirrors the existing in-app services so we can later swap the service implementations from in-memory data to real HTTP requests without changing screen logic.

---

## 1. Conventions

- **Base URL:** `https://api.mybuddy.example.com` (placeholder for now).
- **Format:** JSON over HTTPS.
- **Auth:** None for the MVP; add token-based auth in a later phase.
- **Versioning:** Prefix all routes with `/v1`.
- **Errors:**
  - Non-2xx responses include an error payload:
    ```json
    {
      "error": "string",
      "details": {
        "message": "optional human-readable context"
      }
    }
    ```
  - Example:
    ```json
    {
      "error": "Bad Request",
      "details": {
        "message": "Invalid childId; child does not exist."
      }
    }
    ```

---

## Children API

Children represent the primary “users” of the app: individual kids whose experiences are personalized.

### POST `/v1/children`

Create or update a child profile.

**Request body**

```json
{
  "id": "abc123",                 // optional; if omitted, a new id is generated
  "name": "Ava",                  // required
  "birthday": "2016-05-01",       // optional; ISO date or null
  "interests": ["space", "math"], // optional; defaults to []
  "avatar": "astronaut-1"         // optional
}
```

## Affirmations API

Mirrors `getAffirmations(): Promise<Affirmation[]>`.

### GET `/v1/affirmations`

**Description:** Fetch the list of affirmations for the Affirmations feed.

**Query params:** _none_

**Response 200 OK**

```json
[
  {
    "id": "1",
    "text": "I am capable of amazing things",
    "gradient": ["#FF7E5F", "#FEB47B"]
  }
]
```

**Notes:**
- `gradient` is serialized as a 2-element string array. The exact color values are owned by the backend/theme; the client just renders them.

---

## Subjects API

Mirrors `getSubjects(): Subject[]`.

### GET `/v1/subjects`

**Description:** Fetch the list of all academic subjects.

**Query params:** _none_

**Response 200 OK**

```json
[
  {
    "id": "math",
    "name": "Math",
    "icon": "grid",
    "color": "#8B5CF6"
  }
]
```

**Notes:**
- `id` is a stable key used everywhere else (e.g., flashcards lookups).

---

## Flashcards API

Mirrors `getFlashcards(subjectId: SubjectId, difficulty: DifficultyTier): Promise<Flashcard[]>`.

### GET `/v1/flashcards`

**Description:** Fetch flashcards for a subject at a given difficulty.

**Query params:**

- `subjectId` (required) — one of `"math" | "science" | "reading" | "history"`.
- `difficulty` (required) — one of `"easy" | "medium" | "hard"`.

**Example:**

`GET /v1/flashcards?subjectId=math&difficulty=easy`

**Response 200 OK**

```json
[
  {
    "id": "m1",
    "question": "What is 7 + 5?",
    "answer": "12",
    "acceptableAnswers": ["12", "twelve"],
    "difficulty": "easy"
  }
]
```

**Error cases:**
- `400 Bad Request` if `subjectId` or `difficulty` is missing or invalid.

---

## Chores API

Mirrors `getDailyChores(): Promise<Chore[]>`.

### GET `/v1/chores/daily`

**Description:** Fetch the list of chores suggested for today.

**Query params:** _none_ (future: date, user, household).

**Response 200 OK**

```json
[
  {
    "id": "bed",
    "label": "Make my bed",
    "icon": "home",
    "isExtra": false
  }
]
```

**Notes:**
- `isExtra` is optional in the model; the backend MAY omit it or send `false`.

---

## Outdoor Activities API

Mirrors `getOutdoorActivities(): Promise<OutdoorActivity[]>`.

### GET `/v1/outdoor/activities`

**Description:** Fetch outdoor activities for the Outdoor screen.

**Query params:**

- (future) `isDaily` — when true, only return activities marked as daily.

**Response 200 OK**

```json
[
  {
    "id": "run",
    "name": "Play Tag",
    "category": "Active Play",
    "icon": "zap",
    "time": "15 min",
    "points": 20,
    "isDaily": true
  }
]
```

---

## Type Mapping Summary

Backend JSON payloads should match the existing TypeScript models in `types/models.ts`:

```ts
// Shared union types
export type DifficultyTier = "easy" | "medium" | "hard";
export type SubjectId = "math" | "science" | "reading" | "history";

// Domain models
export interface Affirmation {
  id: string;
  text: string;
  gradient: readonly [string, string];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  acceptableAnswers: string[];
  difficulty: DifficultyTier;
}

export interface Subject {
  id: SubjectId;
  name: string;
  icon: "grid" | "zap" | "book-open" | "globe";
  color: string;
}

export interface Chore {
  id: string;
  label: string;
  icon: "home" | "user" | "trash-2" | "star";
  isExtra?: boolean;
}

export interface OutdoorActivity {
  id: string;
  name: string;
  category: string;
  icon: "zap" | "compass" | "circle" | "edit-3" | "activity";
  time: string;
  points: number;
  isDaily: boolean;
}
```

This file is the **canonical reference for the external HTTP API contract**. Internal data-model details live in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
