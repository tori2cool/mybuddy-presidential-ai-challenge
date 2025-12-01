# Architecture & Service API Overview

This document describes the current client-side service layer in the prototype. All services are synchronous-in-design but implemented as async functions that simulate network latency to prepare the app for a future backend.

Shared domain models live in `types/models.ts` and are reused across all services.

For the external HTTP API contract that these services will eventually call, see [`docs/BACKEND_API.md`](./BACKEND_API.md).

For the database tables that persist this shared content, see [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

## Shared Types (`types/models.ts`) (`types/models.ts`)

```ts
export type DifficultyTier = "easy" | "medium" | "hard";

export type SubjectId = "math" | "science" | "reading" | "history";

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

---

## Affirmations Service (`services/affirmationsService.ts`)

**Responsibility:** Provide the list of daily affirmations used by the Affirmations screen.

### Exports

```ts
export async function getAffirmations(): Promise<Affirmation[]>;
```

### Behavior

- Returns a copy of a static in-memory array of `Affirmation` objects.
- Simulates network latency with `setTimeout(..., 500)`.
- Gradients referenced in each `Affirmation` come from `Gradients` in `constants/theme.ts`.
- Used by the **Affirmations** screen, which:
  - calls `getAffirmations()` inside `useEffect` on mount;
  - shows a loading state while awaiting the Promise;
  - renders a TikTok-style vertical feed of affirmations.

### Data Shape

Each `Affirmation` has:
- `id: string` — unique identifier.
- `text: string` — affirmation copy.
- `gradient: readonly [string, string]` — gradient key from the theme.

---

## Flashcards Service (`services/flashcardsService.ts`)

**Responsibility:** Provide subject-specific flashcards filtered by difficulty.

### Exports

```ts
export async function getFlashcards(
  subjectId: SubjectId,
  difficulty: DifficultyTier,
): Promise<Flashcard[]>;
```

### Behavior

- Holds a static `Record<SubjectId, Flashcard[]>` (`flashcardData`) in memory.
- Filters flashcards by `difficulty` for the requested `subjectId`.
- Simulates network latency with `setTimeout(..., 300)`.
- Used by the **Flashcards** screen, which:
  - tracks the currently selected subject and difficulty;
  - calls `getFlashcards(subjectId, difficulty)` on selection changes;
  - uses a shared async-status UI to show loading/error/empty states.

### Data Shape

Each `Flashcard` has:
- `id: string` — unique identifier within its subject.
- `question: string` — prompt shown to the learner.
- `answer: string` — canonical answer.
- `acceptableAnswers: string[]` — alternate answers accepted as correct.
- `difficulty: DifficultyTier` — one of `"easy" | "medium" | "hard"`.

Flashcards are keyed by `SubjectId`, currently:
- `"math"`, `"science"`, `"reading"`, `"history"`.

---

## Chores Service (`services/choresService.ts`)

**Responsibility:** Provide the list of daily chores for the Chores screen.

### Exports

```ts
export async function getDailyChores(): Promise<Chore[]>;
```

### Behavior

- Returns a copy of a static `dailyChores: Chore[]` array.
- Simulates network latency with `setTimeout(..., 300)`.
- Used by the **Chores** screen, which:
  - calls `getDailyChores()` on mount;
  - shows a standardized loading state via the shared async UI component.

### Data Shape

Each `Chore` has:
- `id: string` — unique identifier.
- `label: string` — display label.
- `icon: "home" | "user" | "trash-2" | "star"` — icon name consumed by the UI.
- `isExtra?: boolean` — optional flag for bonus / non-core chores (not used by current static data but supported by the model).

---

## Outdoor Service (`services/outdoorService.ts`)

**Responsibility:** Provide outdoor activity suggestions for the Outdoor screen.

### Exports

```ts
export async function getOutdoorActivities(): Promise<OutdoorActivity[]>;
```

### Behavior

- Returns a copy of a static `outdoorActivities: OutdoorActivity[]` array.
- Simulates network latency with `setTimeout(..., 300)`.
- Used by the **Outdoor** screen, which:
  - calls `getOutdoorActivities()` on mount;
  - uses the shared async-status UI to render loading/empty states before data is available.

### Data Shape

Each `OutdoorActivity` has:
- `id: string` — unique identifier.
- `name: string` — activity title.
- `category: string` — high-level grouping label (e.g., "Active Play").
- `icon: "zap" | "compass" | "circle" | "edit-3" | "activity"` — icon name for the UI.
- `time: string` — human-readable duration label.
- `points: number` — gamification points awarded.
- `isDaily: boolean` — whether this is intended as a recurring daily activity.

---

## Subjects Service (`services/subjectsService.ts`)

**Responsibility:** Provide the list of academic subjects used to organize flashcards and other content.

### Exports

```ts
export function getSubjects(): Subject[];
```

### Behavior

- Exposes a static in-memory `subjects: Subject[]` array.
- Synchronous API (no artificial latency) because the list is small and constant.
- Used by the **Flashcards** screen (and any subject pickers) to:
  - render a subject selection UI;
  - derive subject colors and icons consistently across the app.

### Data Shape

Each `Subject` has:
- `id: SubjectId` — one of `"math" | "science" | "reading" | "history"`.
- `name: string` — display name.
- `icon: "grid" | "zap" | "book-open" | "globe"` — icon name for the UI.
- `color: string` — hex color used for subject theming.

---

## How to Use These Services in Screens

- Call service functions from `useEffect` on mount or when filters change.
- Keep UI state (`loading`, `error`, `data`) in the screen or a custom hook.
- Use the shared async-status component to avoid duplicating loading / error handling.
- Treat these services as the boundary that will later be swapped to real HTTP calls (e.g., FastAPI backend) without changing screen-level logic.
