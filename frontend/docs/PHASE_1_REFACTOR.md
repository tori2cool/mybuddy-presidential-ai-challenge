# Phase 1: Architecture Refactor

**Goal:** Decouple data generation/fetching from the UI components to prepare for dynamic content and backend integration.

## 1. Shared Types (`types/models.ts`)
**Status:** [x] Done
**Description:** Centralize all data interfaces.
- [x] `Affirmation` (id, text, gradient)
- [x] `Flashcard` (id, question, answer, difficulty, subject)
- [x] `Chore` (id, label, icon, isExtra)
- [x] `OutdoorActivity` (id, name, category, points, isDaily)

## 2. Service Layer (`services/ContentService.ts`)
**Status:** [~] In Progress
**Description:** Create a singleton service to handle data fetching.
- [x] Move hardcoded `affirmations` array from `AffirmationsScreen`.
- [x] Move `flashcardData` from `FlashcardsScreen`.
- [x] Move `dailyChores` and `activities` from their respective screens.
- [ ] Implement async methods:
  - [x] `getAffirmations()`
  - [x] `getFlashcards(subject, difficulty)`
  - [x] `getDailyChores()`
  - [x] `getOutdoorActivities()`

## 3. UI Refactor
**Status:** [ ] Pending
**Description:** Update screens to consume the new service.

### 3.1 Affirmations Screen
- [x] Add `loading` state.
- [x] Use `useEffect` to call `ContentService.getAffirmations()`.
- [x] Handle empty/loading states gracefully.

### 3.2 Flashcards Screen
- [x] Refactor to fetch questions via `ContentService`.

### 3.3 Chores & Outdoor Screens
- [x] Refactor to fetch tasks via `ContentService`.
  - Both `ChoresScreen` and `OutdoorScreen` now use `ContentService` with loading and error states.

---

# Phase 1.5: Service Organization & Async UI

This mini-phase documents the structural refinements done after the initial Phase 1 refactor.

## A. Service Layer Reorganization

- `services/ContentService.ts` has been removed.
- Logic has been split into domain-focused services:
  - `services/affirmationsService.ts`
  - `services/flashcardsService.ts`
  - `services/choresService.ts`
  - `services/outdoorService.ts`
  - `services/subjectsService.ts`
- Each service owns its slice of data fetching and transformation.
- Existing Phase 1 checklists are left untouched; this section just reflects the updated structure.

For a detailed description of each service API and the data models they use, see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

## B. Shared Async UI Handling

- Screens that talk to services now use a shared `AsyncStatus` component to standardize loading and error UI.
- This replaces per-screen inline loading/error JSX and prepares the app for future backend integration.
