# Project Management Process

## 1. Documentation Structure
- **`docs/ROADMAP.md`**: High-level strategic overview. Tracks major phases (e.g., "Phase I: Refactor", "Phase II: Backend").
  - *Update when:* A major phase is completed or strategy changes.
- **`docs/PHASE_X_NAME.md`**: Detailed tactical plan for the *current* active phase.
  - *Update when:* A specific task (checkbox) is completed or a new sub-task is discovered.
- **`docs/ARCHITECTURE.md`**: Canonical reference for the internal service layer, shared data models (e.g., `types/models.ts`, `services/*Service.ts`), and how they align with persisted data.
  - *Consult when:* Designing or refactoring services, touching shared domain types, or mapping models to database tables.
  - *Update when:* You add/rename/remove service functions, change request/response shapes, update shared models, **or** change how models map onto the database schema.
- **`docs/BACKEND_API.md`**: Canonical reference for the **external HTTP API contract** (what the backend exposes to the app).
  - *Consult when:* Defining backend endpoints, updating HTTP routes, or wiring the client to call the backend.
  - *Update when:* You add/rename/remove HTTP endpoints, change request/response payload shapes, or version the public API.
- **`docs/DATABASE_SCHEMA.md`**: Canonical reference for **persistent storage of shared content** (Affirmations, Flashcards, Subjects, Chores, OutdoorActivities).
  - *Consult when:* Designing or updating database tables backing content APIs.
  - *Update when:* You add/rename/remove tables or columns for these content entities.
- **`docs/PROCESS.md`**: This file. Defines how we work.

## 2. Tracking Progress
1. **Start of Task:**
   - Check the relevant `PHASE_*.md` file.
   - Confirm the task is next in the queue.
2. **Completion of Task:**
   - Mark the checkbox as checked `[x]`.
   - Update the "Status" field if applicable (e.g., "Pending" -> "In Progress" -> "Done").
   - If the task involved a major architectural change, add a brief note or link to the PR/commit.

## 3. Defining Next Steps
- **User Role:** The user defines the high-level goal (e.g., "Let's start the backend").
- **Agent Role:**
  1. Review `ROADMAP.md` to see where this fits.
  2. Create or update the relevant `PHASE_*.md` file with a breakdown of steps.
  3. Ask for confirmation before executing code changes.

## 4. Workflow Example
1. User: "Let's fix the Affirmations screen."
2. Agent:
   - Reads `docs/PHASE_1_REFACTOR.md`.
   - Sees `[ ] Refactor Affirmations Screen` is pending.
   - Executes the code changes.
   - Updates `docs/PHASE_1_REFACTOR.md` to `[x] Refactor Affirmations Screen`.
   - Reports back to User.
