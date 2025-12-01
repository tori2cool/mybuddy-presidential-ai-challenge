# Project Roadmap: Aqueryus (MyBuddy)

## 1. Current Status (v1.0 - Prototype)
- **Tech Stack:** React Native (Expo SDK 54), TypeScript.
- **Data Source:** Static hardcoded arrays in screen files.
- **Features Implemented:**
  - Affirmations Feed (TikTok style)
  - Flashcards (Math, Science, etc.)
  - Chores Tracking
  - Outdoor Activities
  - Local Progress Tracking (Context API)

## 2. Phase I: Architecture Refactor (Immediate Focus)
**Goal:** Decouple Data from UI to prepare for backend integration.

> For the up-to-date description of the service layer and shared types, see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

- [ ] **Define Shared Types:** Centralize interfaces (Affirmation, Flashcard, Chore) in `types/models.ts`.
- [ ] **Create Service Layer:** Implement `services/ContentService.ts`.
  - Move static data out of screens.
  - Create async methods (e.g., `fetchAffirmations()`) that simulate network calls.
- [ ] **UI Updates:** Refactor screens to use `useEffect` and handle `loading`/`error` states.

## 3. Phase II: Dynamic Content Preparation
**Goal:** Enable "endless" content generation logic on the client side (interim).
- [ ] **Mock Generator:** Implement simple randomization logic in the Service Layer.
- [ ] **Local Persistence:** Ensure generated content is saved to `AsyncStorage` so it persists between sessions.

## 4. Phase III: Backend Integration (Future)
**Goal:** Connect to a FastAPI backend for AI-driven content.

> Canonical HTTP contract: see [`docs/BACKEND_API.md`](./BACKEND_API.md).
> Canonical content schema: see [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

- [ ] **Backend Setup:** FastAPI service with endpoints that implement the routes in `BACKEND_API.md`.
- [ ] **API Client:** Replace static returns in service files (e.g., `affirmationsService`, `flashcardsService`, etc.) with `fetch()`/HTTP calls to the backend.
- [ ] **Authentication:** Secure API usage.

## 5. Phase IV: Polish & Scaling
- [ ] **Offline Sync:** Cache backend results for offline usage.
- [ ] **User Accounts:** Cloud sync for progress.
