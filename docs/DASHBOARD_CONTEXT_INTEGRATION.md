# DashboardContext Integration — Checklist Implementation Guide

## Why this exists

We are migrating to a backend-driven dashboard so that **one atomic backend response** (GET `/dashboard`) becomes the single source of truth for all dashboard/progress UI. This reduces drift between multiple client-side progress models, prevents partial UI updates from conflicting local state, and simplifies refresh/offline behavior.


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
- [ ] Flashcard/lesson flow (if in scope):
  - [ ] Events POST successfully
  - [ ] Refresh is debounced (no request storm)
  - [ ] Leaving flow flushes a final refresh
- [ ] Error injection:
  - [ ] Simulate 500/timeout on `GET /dashboard` → last known good `data` retained
  - [ ] Simulate failure on event POST → flow does not crash and user can continue/retry

### Screenshots / log evidence checklist

Attach evidence (or link to logs) for the relevant items.

- [ ] Network inspector screenshot/log showing `GET /dashboard` response
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
+--------------------+         GET /dashboard         +-------------------+
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
- Add/standardize `dashboardService` (GET `/dashboard`) and `eventsService` (POST progress events).
- Migrate consumers (starting with `ProfileScreen`) from `ProgressContext` to `DashboardContext`.
- Keep a **temporary fallback** to the existing `ProgressContext` during migration.
  - During migration, **fallback-mapped values may diverge** from backend dashboard values.
  - This divergence is **acceptable** as long as it is clearly marked via `source: "fallback"` and is used only when backend data is unavailable/flagged off.
- Define refresh strategy (including **debounced refresh** for flashcards), caching policy, offline/error behavior.
- Explicitly: `ProgressContext` is **deprecated** — no new features should be added to it; goal is eventual removal (Phase 3).

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
  - `GET /dashboard` (atomic dashboard)
  - progress event POST endpoint: `POST /children/{childId}/events/{kind}`
- [ ] **Wrong event schema**: ensure `eventsService` sends the backend-required payload (field names/types), and that backend accepts it.
- [x] **Optimistic mutations removed**: `DashboardContext` is read-only for dashboard/progress numbers/tiles. The only supported update mechanism is **POST event → re-fetch dashboard**.

**Acceptance criteria (blockers resolved)**
- [ ] A network capture shows `GET /dashboard` hitting the correct route and returning the expected payload.
- [ ] A network capture shows event POST hitting `POST /children/{childId}/events/{kind}` with the correct payload and receiving a 2xx response.
- [x] UI dashboard/progress values change **only** after a successful dashboard refresh (not by local mutation).

### File edit sequence (checklist)

1) **`frontend/services/dashboardService.ts`**
   - [x] Verify the base URL and **exact endpoint path** for the dashboard.
     - Implemented route: `GET /children/{childId}/dashboard`
   - [x] Ensure response typing/normalization matches the backend dashboard payload.
     - Service coerces/validates fields into `DashboardData`.
   - [ ] Support cancellation if used (not currently implemented).

   **Acceptance criteria**
   - [x] `getDashboard(childId)` makes exactly one request to `/children/{childId}/dashboard` and returns typed data.

2) **`frontend/services/eventsService.ts`**
   - [x] Verify the **exact POST endpoint path** used for events.
     - Implemented route: `POST /children/{childId}/events/{kind}`
   - [x] Implement/adjust `postProgressEvent(...)` payload shape to match the backend schema.
     - Route params include: `childId`, `kind`
     - Body includes event fields per kind (and `occurredAt`/metadata if supported by backend).

   **Acceptance criteria**
   - [x] A representative event can be posted successfully from the app (2xx) to `/children/{childId}/events/{kind}`.


3) **`frontend/contexts/DashboardContext.tsx`**
   - [ ] Implement `DashboardContext` state (`data/status/error/lastUpdatedAt/source`).
   - [ ] Implement cache-first hydration + stale-while-revalidate.
   - [ ] Implement `refreshDashboard()` using `dashboardService.getDashboard()`.
   - [ ] Implement `postEventAndRefresh()` using `eventsService.postEvent()` then `refreshDashboard()`.
   - [ ] Ensure **no optimistic mutations** of dashboard data.

   **Acceptance criteria**
   - [ ] On refresh failure, last known good `data` remains available.
   - [ ] `postEventAndRefresh()` does not update dashboard fields until after a dashboard fetch.

4) **Provider wiring (app root)**
   - [x] Wrap the app/navigation tree in `DashboardProvider`.
   - [x] Wiring point in this repo:
     - `frontend/App.tsx`
   - [x] Provider order verified (does not break auth/user/child selection dependencies).

   **Acceptance criteria**
   - [x] No runtime errors on app start; dashboard context is available to screens.


5) **`frontend/screens/ProfileScreen.tsx`**
   - [x] Replace reads from `ProgressContext` with `useDashboard()` (while keeping fallback mapping in the context during migration).
   - [x] Add pull-to-refresh trigger calling `refreshDashboard()`.
   - [x] Error UI retains last known good values (non-blocking error on refresh failure).
   - [x] Still keeps `ProgressContext` fallbacks (via `DashboardContext` source=`"fallback"`) during migration.

   **Acceptance criteria**
   - [x] Profile renders from cache when available; refresh updates values from backend.


6) **Activity / learning flow screens (event sources)**
   - Primary event sources in this repo include:
     - `frontend/screens/FlashcardsScreen.tsx`
     - `frontend/screens/ChoresScreen.tsx`
     - `frontend/screens/OutdoorScreen.tsx`
     - `frontend/screens/AffirmationsScreen.tsx`
   - [x] Activity screens post events via `useDashboard().postEvent(...)`.
   - [x] Debounced refresh flush is implemented:
     - on flashcards close
     - on app background via `AppState` in `DashboardProvider`
   - [ ] **Option A (required)**: update the *top-of-screen stat displays* on these screens to render from `useDashboard().data` instead of `getTodayStats()` / `progress.*`.
     - Current issue: dashboard backend is stable, but these screens still show stale values because they display from `ProgressContext`.

   **Acceptance criteria**
   - [x] High-frequency interactions do not create request storms.
   - [x] A final refresh occurs at the end of the flashcard flow.
   - [x] A final refresh is flushed when the app backgrounds.
   - [ ] Stat displays (Today/Total/Points) match backend dashboard after refresh.

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

- [x] Cache store used (as implemented): `@react-native-async-storage/async-storage`
- [x] Cache key (as implemented): `dashboard:v1:user:<userId>:child:<childId>`
- [x] Cached value shape (as implemented): `{ dashboard: DashboardData, lastUpdatedAt: string }`
- [ ] Define staleness policy (e.g., 5–15 minutes) and implement stale detection (not currently implemented).

**Acceptance criteria**
- [ ] Cache read/write is resilient (no crashes on corrupt/missing values).
- [ ] Staleness logic triggers refresh on app foreground/screen focus when stale.

---

## Phase 1 — Read-path migration (ProfileScreen first)

### 1.1 Migrate `ProfileScreen` to `DashboardContext`

- [x] Update `ProfileScreen` to read core completion counters from `useDashboard()`.
  - File: `frontend/screens/ProfileScreen.tsx`
- [ ] **Option A (required)**: remove remaining *displayed stats* reads from `ProgressContext` on Profile.
  - Specifically migrate these UI sections to **dashboard-backed fields only**:
    - weekly stats (`getThisWeekStats()`)
    - achievements lists
    - balanced progress + reward level
- [x] Add pull-to-refresh calling `refreshDashboard()`.
- [x] Loading/error UI behavior:
  - [x] If `data` exists and refresh fails: show non-blocking inline message.
  - [x] If no `data` and fetch fails: falls back to derived ProgressContext dashboard shape.

**Acceptance criteria**
- [x] Profile screen renders quickly from cache when available.
- [x] Pull-to-refresh triggers network call and updates UI.
- [ ] No `ProgressContext` reads remain for completion/stats display once `DashboardData` has been expanded to include week/bySubject/streaks/achievements/balanced/reward.

---

### 1.2 Migrate additional read-only consumers

- [ ] Identify other screens/components that read progress/dashboard data.
  - **File path(s)**: _TBD_ (add list)
- [ ] Replace reads from `ProgressContext` with `DashboardContext`.

**Acceptance criteria**
- [ ] No screen requires `ProgressContext` solely for dashboard rendering (except where still in migration scope).

---

## Phase 2 — Write-path migration (events + refresh)

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
- [x] Backend becomes the authority for progress updates (POST event → refresh dashboard).
- [ ] UI stat displays should not rely on `ProgressContext` (Option A read migration).

---

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
- [ ] Flashcard flow:
  - [ ] answering posts events
  - [ ] dashboard refresh is debounced
  - [ ] leaving flow flushes refresh

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

- [ ] `DashboardContext` is implemented, documented, and used by all dashboard/progress UI.
- [ ] `dashboardService` + `eventsService` are the only API touchpoints for dashboard/events.
- [ ] Cache-first hydration works and staleness policy is enforced.
- [ ] Refresh strategies are implemented (immediate + debounced + flush).
- [ ] Offline/error behavior matches this guide.
- [ ] Test checklist completed (unit + integration/E2E as applicable).
- [ ] Feature flag and fallback are removed (or explicitly documented if retained).
- [ ] No remaining references to legacy progress data sources for dashboard UI.

---

## Closeout Criteria

- [ ] Flag is fully rolled out (or removed).
