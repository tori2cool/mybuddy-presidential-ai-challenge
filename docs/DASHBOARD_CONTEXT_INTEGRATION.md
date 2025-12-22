# DashboardContext Integration — Checklist Implementation Guide

## Why this exists

We are migrating to a backend-driven dashboard so that **one atomic backend response** (GET `/children/{childId}/dashboard`) becomes the single source of truth for all dashboard/progress UI. This reduces drift between multiple client-side progress models, prevents partial UI updates from conflicting local state, and simplifies refresh/offline behavior.


---

## Agent Closeout Template

Use this section when closing a PR that touches the DashboardContext integration. Copy/paste into the PR description or the final closeout comment and fill in the blanks.

### PR checklist (author)

- [ ] Scope matches this guide (no unrelated refactors).
- [ ] Feature flag behavior verified (ON/OFF) as applicable to the phase.
- [x] `DashboardContext` remains read-only for dashboard fields (no optimistic mutations).
- [ ] Error handling preserves last known good `data` on refresh failure.
- [ ] Cache key/versioning reviewed (namespaced + versioned).
- [ ] Logging/telemetry (if present in the app) updated for:
  - [ ] dashboard fetch failures
  - [ ] event post failures
  - [ ] request volume spikes (debounced refresh)
- [ ] Tests updated/added (unit + integration as applicable).
- [ ] Docs updated (this file + any referenced docs, including `docs/KNOWN_ISSUES_DASHBOARD_CONTEXT.md`).

### Verification commands

Fill in the commands that were actually run.

```bash
# install
<command>

# typecheck / lint
<command>

# unit tests
<command>

# e2e / integration (if applicable)
<command>

# build / bundle (if applicable)
<command>
```

### Manual QA script

Record device/OS/build info and the results.

**Environment**
- App build: `<debug|release>`
- Platform: `<iOS|Android>`
- Device/OS: `<device model> / <OS version>`
- Account state: `<new user|existing user|multi-child|offline cached>`
- Feature flag(s): `useBackendDashboard=<on|off>`

**Scenarios**
- [ ] Cold start → dashboard/profile loads (cache-first if available)
- [ ] Pull-to-refresh (or focus refresh) updates dashboard
- [ ] Offline mode:
  - [ ] With cache: renders cached dashboard and shows non-blocking error on refresh
  - [ ] Without cache: shows retry-able offline/empty state
- [ ] Activity completion flows (if in scope):
  - [ ] Chores modal: completing a chore posts an event; **no immediate optimistic increment** in UI
  - [ ] Outdoor modal: completing an activity posts an event; **no immediate optimistic increment** in UI
  - [ ] Affirmations modal/swipe: viewing posts at most once per item (deduped); **no immediate optimistic increment** in UI
  - [ ] Flashcards modal/flow: answers post events; refresh is debounced and flushes on exit
  - [ ] Verify counts/points change **only after** dashboard refresh (e.g., return to dashboard or manual refresh)
- [ ] Error injection:
  - [ ] Simulate 500/timeout on `GET /children/{childId}/dashboard` → last known good `data` retained
  - [ ] Simulate failure on event POST → flow does not crash and user can continue/retry

### Screenshots / log evidence checklist

Attach evidence (or link to logs) for the relevant items.

- [ ] Network inspector screenshot/log showing `GET /children/{childId}/dashboard` response
- [ ] Network inspector screenshot/log showing representative event POST(s)
- [ ] Screenshot(s) of Profile/dashboard UI with backend data
- [ ] Screenshot(s) of error/empty states (offline / server error)
- [ ] Console/log snippet showing debounced refresh behavior (if implemented)
- [ ] Any relevant metrics/telemetry dashboards (if used)

### Final sign-off

**Coding agent sign-off**
- Implemented by: `<name>`
- Reviewed by: `<name>`
- Date: `<YYYY-MM-DD>`
- Notes/risks/follow-ups: `<text>`

**Docs agent sign-off**
- Docs updated by: `<name>`
- Date: `<YYYY-MM-DD>`
- Notes: `<text>`

```
+--------------------+  GET /children/{childId}/dashboard  +-------------------+
|   React Screens    | <----------------------------> |      Backend      |
| (Profile, etc.)    |                                 |  atomic dashboard |
+---------+----------+                                 +---------+---------+
          |                                                    |
          | useDashboard()                                     |
          v                                                    |
+--------------------+     read-only state + caching           |
|  DashboardContext  | <---------------------------------------+
| (no optimistic mut)|
+--------------------+
          ^
          |
          | (migration-only)
          |
+--------------------+
|  ProgressContext   |
|   DEPRECATED       |
+--------------------+
```

This guide is a **checklist-driven implementation plan** for integrating a backend-driven dashboard/progress model via a new `DashboardContext`.

- Audience: coding agents + docs agents
- Style: task lists with **explicit tasks**, **file paths**, **acceptance criteria**, **test checklist**, **rollout phases**, and **closeout criteria**

> If any path/name below differs in the repo, update the checklist item with the correct location during implementation.

---

## Dashboard Contract (Source of Truth)

- **Backend endpoint `GET /children/{childId}/dashboard` is the atomic source of truth** for dashboard/progress.
  - Frontend route (as implemented): `dashboardService.getDashboard(childId)` → `GET /children/{childId}/dashboard`
- Progress events are written via the children events endpoint:
  - Frontend route (as implemented): `eventsService.postProgressEvent(childId, kind, payload)` → `POST /children/{childId}/events/{kind}`
- The client **must not aggregate** dashboard data by combining multiple endpoints, local stores, or partially-mutated context state.
- `DashboardContext` is **read-only for dashboard fields**: it should not apply optimistic mutations to points/counters/tiles. Updates happen via **POST event → refresh `GET /children/{childId}/dashboard`**.

> Note: backend `dashboard/events` fixes (SQLAlchemy group-by/distinct/case + `timestamptz`) are considered stable as of this integration phase.

---

## Scope

- Introduce `DashboardContext` (API-first) with cache-first hydration.
- Add/standardize `dashboardService` (GET `/children/{childId}/dashboard` or `GET /v1/children/{childId}/dashboard` depending on API base path) and `eventsService` (POST progress events).
- Migrate consumers (starting with `ProfileScreen`) from `ProgressContext` to `DashboardContext`.
- Keep a **temporary fallback** to the existing `ProgressContext` during migration.
  - During migration, **fallback-mapped values may diverge** from backend dashboard values.
  - This divergence is **acceptable** as long as it is clearly marked via `source: "fallback"` and is used only when backend data is unavailable/flagged off.
- Define refresh strategy (including **debounced refresh** for flashcards), caching policy, offline/error behavior.
- Explicitly: `ProgressContext` is **deprecated**.
  - **Current usage:** only for shared constants (e.g., `SUBJECTS`).
  - No new features should be added to it; goal is eventual removal (Phase 3).

Non-goals (for this document):
- Designing backend endpoints/schemas (only integrate what backend provides).
- Deep UI redesign.

---

## Prerequisites / Inputs

- [ ] Confirm backend endpoints and schemas for:
  - [ ] Dashboard fetch (single endpoint preferred)
  - [ ] Progress event posting (flashcard answered, session completed, etc.)
- [ ] Confirm existing app storage layer for caching (AsyncStorage/MMKV/etc.).
- [ ] Identify current progress source(s): `ProgressContext` and any services it uses.
- [ ] Identify primary dashboard consumers (screens/components).

**Acceptance criteria**
- [ ] Backend contracts are documented (link to API docs or add a short summary here).
- [ ] Identified file paths in the repo for:
  - [ ] Progress context (current)
  - [ ] Screens that show progress/dashboard data

---

## Architecture (Target State)

### Modules

- **`DashboardContext`**
  - State: `{ data, status, error, lastUpdatedAt, source }`
  - Actions: `refreshDashboard`, `invalidateDashboard`, `postEventAndRefresh`
  - Cache-first hydration (stale-while-revalidate)
  - Migration fallback to `ProgressContext`
  - **Read-only dashboard state**: do not mutate dashboard fields optimistically.
  - **Refresh failure rule**: on refresh failure, **retain the last known good `data`** and surface the error non-blockingly.

- **`dashboardService`**
  - Fetch dashboard payload (typed)
  - No UI state
  - Supports cancellation (AbortController or equivalent)

- **`eventsService`**
  - Post progress-related events (typed)
  - Optionally provides domain helpers (e.g., `postFlashcardAnswered`)

### Refresh strategy

- Immediate refresh: low-frequency, high-impact events (session completion, chores/outdoor/affirmation)
- Debounced refresh: high-frequency events (flashcards)
- Flush debounced refresh on:
  - leaving flashcard flow
  - app background (implemented via `AppState`)

**Known behavior**
- During auth/bootstrap, the first `GET /children/{childId}/dashboard` may transiently 401 (token not yet attached/rotated). `DashboardContext` is designed to:
  - retain last known good cached data when available
  - otherwise fall back to derived `ProgressContext` data until the next refresh succeeds

---

## Rollout Phases (High-level)

- **Phase 0 — Prep/Scaffold**: add services + context with cache hydration.
- **Phase 1 — Read-path migration**: migrate `ProfileScreen` to read from `DashboardContext` with fallback.
- **Phase 2 — Write-path migration**: route progress-affecting flows to `eventsService` and trigger refresh.
- **Phase 3 — Remove fallback**: remove `ProgressContext` usage from dashboard UI and delete adapter/flag.
- **Phase 4 — Optimize**: batching, conditional requests, better cache/refresh heuristics.

Each phase below includes checklists and acceptance criteria.

---

## Minimal Implementation Order (repo-specific)

This section is the **exact, minimal file-edit sequence** for this repo. Follow it in order to avoid mismatched contracts and UI drift.

### Blockers to resolve first (must be done before continuing)

These are the currently known blockers. **Do not proceed** with context wiring/screens until all three are resolved and verified end-to-end.

- [ ] **Wrong endpoints**: ensure the client services target the backend’s actual routes for:
  - `GET /children/{childId}/dashboard` (atomic dashboard)
  - progress event POST endpoint: `POST /children/{childId}/events/{kind}`
- [ ] **Wrong event schema**: ensure `eventsService` sends the backend-required payload (field names/types), and that backend accepts it.
- [x] **Optimistic mutations removed**: `DashboardContext` is read-only for dashboard/progress numbers/tiles. The only supported update mechanism is **POST event → re-fetch dashboard**.

**Acceptance criteria (blockers resolved)**
- [ ] A network capture shows `GET /children/{childId}/dashboard` hitting the correct route and returning the expected payload.
- [ ] A network capture shows event POST hitting `POST /children/{childId}/events/{kind}` with the correct payload and receiving a 2xx response.
- [x] UI dashboard/progress values change **only** after a successful dashboard refresh (not by local mutation).

### File edit sequence (checklist)

> Status legend: ✅ done · 🟡 partial · ⬜ todo

1) **`frontend/services/dashboardService.ts`** ✅
   - Uses atomic dashboard endpoint: `GET /children/{childId}/dashboard`.
   - Returns typed `DashboardData`.
   - ⬜ (Optional) cancellation support if you see overlapping fetches.

2) **`frontend/services/eventsService.ts`** ✅
   - Posts progress events to: `POST /children/{childId}/events/{kind}`.
   - Payload shape aligned with backend for the implemented kinds.

3) **`frontend/contexts/DashboardContext.tsx`** 🟡
   - ✅ Implements `data/status/error/lastUpdatedAt/source` with cache-first hydration.
   - ✅ Read-only for dashboard fields (no optimistic dashboard mutations).
   - ✅ Debounced refresh for flashcards + `flushDebouncedRefresh()`.
   - ✅ Cache key versioning implemented (see **Caching policy**).
   - ⬜ Define and implement a staleness/TTL policy (currently not enforced).
   - ⬜ Remove or gate debug logs if any remain (keep behind `__DEV__` or a logging flag).

4) **Provider wiring (app root)** ✅
   - `DashboardProvider` wraps navigation tree (repo wiring: `frontend/App.tsx`).

5) **Read-path migration**

   **`frontend/screens/ProfileScreen.tsx`** 🟡
   - ✅ Core completion displays are already dashboard-driven.
   - ⬜ If desired, migrate remaining UI elements off `ProgressContext`:
     - achievements
     - weekly goals / weekly stats
     - level progress / balanced progress widgets

   **`frontend/screens/FlashcardsScreen.tsx`** ✅
   - ✅ Completion/progress display reads migrated to `DashboardContext`.
   - ✅ Removed `ProgressContext` display reads for completion.

6) **Activity / learning flow screens (event sources + stat bars)**

   **Option A migration batches — current progress**

   **Batch 1 (✅ complete): stat bars now dashboard-driven**
   - ✅ `frontend/screens/ChoresScreen.tsx` top stat bar uses `useDashboard().data`
   - ✅ `frontend/screens/OutdoorScreen.tsx` top stat bar uses `useDashboard().data`
   - ✅ `frontend/screens/AffirmationsScreen.tsx` top stat bar uses `useDashboard().data`

   **Batch 1.5–1.7 (✅ complete): Affirmations swipe posting fixes**
   - ✅ Stable callbacks (avoid re-creating handlers during scroll)
   - ✅ `onScroll` index detection for determining the active card
   - ✅ Per-child de-dupe reset so events can post correctly when switching children

   **Write-path (✅ complete for these flows):**
- ✅ Flashcard answer → post event → debounced refresh
- ✅ Chore completed (including modal flow) → post event → refresh
- ✅ Outdoor activity completed (including modal flow) → post event → refresh
- ✅ Affirmation viewed (including modal flow) → post event → refresh

**Implementation notes (Affirmations swipe):**
- Uses `onScroll` index detection to determine the active card.
- De-dupes **per session** and **per child** so each affirmation posts at most once per viewing session, and switching children resets dedupe state.

**Acceptance criteria (updated)**
- ✅ Stat displays (Today/Total/Points) on Chores/Outdoor/Affirmations reflect backend dashboard **after refresh**.
- ✅ Activity flows **post events only**; there is no local progress aggregation or optimistic `ProgressContext` mutations.
- ✅ No optimistic UI updates: counts/points do not change until the next successful `GET /children/{childId}/dashboard` (e.g., after leaving flow or manual refresh).
- ✅ Flashcards completion UI reflects backend dashboard (no `ProgressContext` display reads).
- ✅ Affirmations swipe flow posts exactly once per item (deduped) and continues to work after child switch.

---

## Phase 0 — Prep/Scaffold

### 0.1 Add/confirm feature flag

- [ ] Add a feature flag (or config) such as `useBackendDashboard`.
  - **Status**: not present in current implementation.
  - Current behavior: `DashboardContext` uses backend when `childId` is available and falls back to `ProgressContext` when `childId` is missing or when the first fetch fails with no cached data.

**Acceptance criteria**
- [ ] Flag can be toggled without rebuild (if supported by the app’s flag system).
- [ ] Default behavior is unchanged (existing dashboard/progress still works).

---

### 0.2 Create/standardize `dashboardService`

- [x] Create/verify dashboard service module.
  - **File path(s)**:
    - [x] `frontend/services/dashboardService.ts`
- [ ] Implement `getDashboard(...)` (single endpoint preferred).
- [ ] Ensure service returns typed/normalized data and does not depend on UI state.
- [ ] Add cancellation support for rapid refreshes.

**Acceptance criteria**
- [ ] `dashboardService.getDashboard()` can be called from a context without causing re-render loops.
- [ ] Network errors propagate as typed/handled errors.

---

### 0.3 Create/standardize `eventsService`

- [x] Create/verify events service module.
  - **File path(s)**:
    - [x] `frontend/services/eventsService.ts`
- [ ] Implement generic `postEvent(event)`.
- [ ] (Optional) Add domain helpers:
  - [ ] `postFlashcardAnswered(...)`
  - [ ] `postSessionCompleted(...)`

**Acceptance criteria**
- [ ] Events are posted using the app’s existing API client/auth.
- [ ] Errors are handled without crashing flows.

---

### 0.4 Implement `DashboardContext`

- [ ] Create a new context/provider and hook.
  - **File path(s)**:
    - [x] `frontend/contexts/DashboardContext.tsx`
- [ ] Define state shape:
  - [ ] `data` (nullable)
  - [ ] `status`: `idle | loading | refreshing | error`
  - [ ] `error` (optional)
  - [ ] `lastUpdatedAt`
  - [ ] `source`: `cache | network | fallback`
- [ ] Implement cache hydration:
  - [ ] Read cached snapshot at startup/mount
  - [ ] Render immediately from cache when available
  - [ ] Background refresh (stale-while-revalidate)
- [ ] Implement actions:
  - [ ] `refreshDashboard({ force?: boolean })`
  - [ ] `invalidateDashboard()`
  - [ ] `postEventAndRefresh(event, strategy)`
- [ ] Add fallback adapter to `ProgressContext` during migration.
  - **File path(s)**:
    - [x] `frontend/contexts/DashboardContext.tsx`
    - [ ] `frontend/adapters/progressToDashboard.ts` (if created)

**Acceptance criteria**
- [ ] App starts and renders with cached dashboard when present.
- [ ] If backend fetch succeeds, state updates and cache is written.
- [ ] If backend fetch fails and fallback is enabled, context provides mapped data and sets `source: "fallback"`.
- [ ] On refresh failure (after having data), last known good `data` remains available.

---

### 0.5 Caching policy

- ✅ Cache store used (as implemented): `@react-native-async-storage/async-storage`
- ✅ Cache key versioning implemented (as documented/implemented):
  - Key: `dashboard:v1:user:<userId>:child:<childId>`
  - Bump the `v1` prefix if the cached payload shape changes.
- ✅ Cached value shape (as implemented): `{ dashboard: DashboardData, lastUpdatedAt: string }`
- ⬜ Staleness policy is **not yet defined/enforced**.
  - Remaining work: define a TTL (e.g., 5–15 minutes) and when to revalidate (foreground, focus, pull-to-refresh), and implement stale detection.

**Acceptance criteria**
- ✅ Cache read/write is resilient (no crashes on corrupt/missing values).
- ⬜ Staleness logic triggers refresh on app foreground/screen focus when stale.

## Phase 1 — Read-path migration (ProfileScreen first)

### 1.1 ProfileScreen status

- ✅ `ProfileScreen` core completion counters are already reading from `useDashboard()`.
- 🟡 `ProfileScreen` still may read `ProgressContext` for **non-core** display sections.
  - Remaining work (optional / if desired): remove `ProgressContext` usage for:
    - achievements
    - weekly goals / weekly stats
    - level progress / balanced progress widgets

**Acceptance criteria**
- ✅ Profile renders from cache when available; refresh updates values from backend.
- ⬜ If the optional migration is performed: Profile has **no** `ProgressContext` reads for dashboard/progress display.

### 1.2 Other read-only consumers

- ✅ `FlashcardsScreen` completion/progress display migrated to `DashboardContext`.
- ⬜ Identify any remaining components that render progress from `ProgressContext` and migrate them.

---

## Phase 2 — Write-path migration (events + refresh)

**Status (progressed):** activity flows now **post events only** and rely on **dashboard refresh** for UI updates. There is **no local progress aggregation** and **no optimistic `ProgressContext` mutations** in the migrated flows.

### 2.1 Route progress-affecting flows through `eventsService`

- [x] Identify flows that update progress:
  - [x] Flashcard answer
  - [x] Chore completed
  - [x] Outdoor activity completed
  - [x] Affirmation viewed
- [x] Update those flows to call `useDashboard().postEvent(...)` (which uses `eventsService.postProgressEvent`).
  - Files:
    - `frontend/screens/FlashcardsScreen.tsx`
    - `frontend/screens/ChoresScreen.tsx`
    - `frontend/screens/OutdoorScreen.tsx`
    - `frontend/screens/AffirmationsScreen.tsx`
- [x] After successful post, trigger dashboard refresh.
  - Debounced for flashcards, immediate for other event kinds.

**Acceptance criteria**
- [x] Backend is the authority for progress updates (POST event → refresh dashboard).
- [x] Migrated activity flows do not perform optimistic local increments; UI values change only after refresh.
- [x] Modal-based completion flows (Chores/Outdoor/Affirmations/Flashcards modal) do not call `ProgressContext` mutation APIs.

### 2.2 Implement debounced refresh for flashcards

- [x] Debounced `refreshDashboard` is implemented in `frontend/contexts/DashboardContext.tsx`.
  - Debounce interval (as implemented): **1500ms**.
  - Flush API (as implemented): `flushDebouncedRefresh()`.
- [x] Debounced refresh is flushed on:
  - [x] leaving/closing the flashcard flow
  - [x] app background (via `AppState` handling in `DashboardProvider`)
  - [ ] session end (if distinct from close in this app; verify)

**Acceptance criteria**
- [x] Flashcard answering does not cause request storms.
- [x] A final refresh occurs at the end of the flashcard flow.
- [x] A final refresh occurs when the app backgrounds.

---

## Phase 3 — Remove fallback & legacy usage

### 3.1 Remove `ProgressContext` fallback adapter

- [ ] Remove feature flag behavior and adapter mapping.
  - **File path(s)**:
    - [x] `frontend/contexts/DashboardContext.tsx`
    - [ ] `frontend/adapters/progressToDashboard.ts` (if created)
- [ ] Remove remaining consumers of `ProgressContext` for dashboard/progress UI.

**Acceptance criteria**
- [ ] `DashboardContext` is the sole source of dashboard/progress data.
- [ ] No references to the fallback adapter remain.

---

### 3.2 Cleanup

- [ ] Delete obsolete code paths, dead feature flags, and unused services.
- [ ] Update any documentation referencing `ProgressContext` as the dashboard source.

**Acceptance criteria**
- [ ] Repo builds cleanly with no unused imports/warnings.

---

## Phase 4 — Optimization (optional)

- [ ] Add event batching for high-frequency flows.
- [ ] Add conditional requests (ETag/If-Modified-Since) if supported.
- [ ] Tune cache TTL and refresh heuristics.

**Acceptance criteria**
- [ ] Reduced network usage with unchanged UX.

---

## Test Checklist

### Unit tests

- [ ] `dashboardService.getDashboard()` parses/returns expected shape.
- [ ] `eventsService.postEvent()` sends correct payload and handles errors.
- [ ] `DashboardContext`:
  - [ ] hydrates from cache
  - [ ] refresh updates state + cache
  - [ ] error states do not wipe last known good `data`
  - [ ] fallback mapping works when flag disabled / API fails (Phase 1–2 only)
  - [ ] debounced refresh triggers at most once per debounce window

### Integration / E2E

- [ ] Profile screen shows cached data immediately (if cache present).
- [ ] Pull-to-refresh updates dashboard.
- [ ] Offline mode:
  - [ ] cached dashboard renders
  - [ ] no-cache shows offline empty state
- [ ] Activity flows (Chores/Outdoor/Affirmations/Flashcards modal):
  - [ ] events POST successfully
  - [ ] **no optimistic UI updates** occur during/after completion actions
  - [ ] counts/points change only after the next successful dashboard refresh (manual refresh or returning to dashboard)
- [ ] Flashcard flow:
  - [ ] answering posts events
  - [ ] dashboard refresh is debounced
  - [ ] leaving flow flushes refresh
- [ ] Affirmations swipe:
  - [ ] uses `onScroll` to determine active card
  - [ ] per-session + per-child dedupe prevents duplicate posts

### Regression

- [ ] With feature flag OFF, app behaves as before (until Phase 3).
- [ ] No extra network request storms on frequent interactions.

---

## Rollout Plan (Operational)

### Phase A — Internal / dev

- [ ] Enable flag for local/dev builds.
- [ ] Validate API responses and UI behavior.

### Phase B — Limited rollout

- [ ] Enable flag for a small cohort.
- [ ] Monitor:
  - [ ] dashboard fetch error rate
  - [ ] event post error rate
  - [ ] request volume (esp. flashcards)
  - [ ] cold-start time

### Phase C — Full rollout

- [ ] Gradually ramp to 100%.
- [ ] Proceed to Phase 3 cleanup once stable.

---

## Definition of Done (DoD)

All items below must be checked before closing the integration.

- ✅ `DashboardContext` is implemented, documented, and used by the migrated dashboard/progress UI.
- ✅ `dashboardService` + `eventsService` are the only API touchpoints for dashboard/events.
- 🟡 Cache-first hydration works; **staleness policy still needs definition/enforcement**.
- ✅ Refresh strategies are implemented (immediate + debounced + flush).
- ✅ Option A migration progress (batches):
  - ✅ Batch 1: Chores/Outdoor/Affirmations stat bars read from `DashboardContext`
  - ✅ Batch 1.5–1.7: Affirmations swipe posting stabilized (stable callbacks, `onScroll` index detection, per-session + per-child dedupe)
  - ✅ Batch 3: FlashcardsScreen completion display migrated to `DashboardContext` (removed `ProgressContext` display reads)
- ✅ Phase 2 write-path migration progressed:
  - ✅ Activity flows post events only
  - ✅ No optimistic `ProgressContext` mutations in Chores/Outdoor/Affirmations/Flashcards modal flows
- 🟡 Legacy cleanup still pending:
  - remove remaining `ProgressContext` usage on Profile for achievements/weekly goals/level widgets (if still present)
  - remove `ProgressContext` entirely once remaining dependencies (constants like `SUBJECTS`) are relocated
- 🟡 Housekeeping still pending:
  - decide whether to remove debug logs or keep them gated
  - add/expand tests (unit + integration)

---

## Closeout Criteria

- [ ] Flag is fully rolled out (or removed).
