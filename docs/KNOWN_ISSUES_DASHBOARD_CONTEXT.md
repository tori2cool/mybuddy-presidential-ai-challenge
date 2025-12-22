# Known Issues — DashboardContext integration

This document tracks known, expected issues during the DashboardContext migration.

## 1) Transient 401s during auth bootstrap

**Symptom**: On cold start, the first `GET /children/{childId}/dashboard` may return `401 Unauthorized`.

**Cause**: Auth/token state can briefly lag behind initial app render (e.g., token refresh/attachment not completed yet), while `DashboardContext` is already attempting a SWR background refresh.

**Expected behavior**

- If cached dashboard data exists: UI should render from cache; refresh failure should be non-blocking.
- If no cached dashboard data exists: `DashboardContext` may temporarily fall back to derived `ProgressContext` data until a later refresh succeeds.

**Mitigation options (optional)**

- Gate the initial `refreshDashboard()` call on an explicit `authReady` signal (if/when the auth layer exposes one).
- Treat `401` specially (e.g., backoff + retry once after token refresh).

## 2) Duplicate affirmation events

**Symptom**: An affirmation view event may be posted twice for the first item:

- once in the `useEffect()` that seeds the initial item, and
- once in `onViewableItemsChanged` (depending on timing/threshold).

**Current status**: The screen tracks `viewedIds` and attempts to avoid duplicates, but timing can still produce dupes.

**Mitigation options (optional)**

- Prefer a single source of truth for “first item viewed” (e.g., rely solely on `onViewableItemsChanged`).
- Add an idempotency key to the event payload (if backend supports it).
- Backend-side dedupe: unique constraint on `(child_id, kind, affirmation_id, date_trunc('day', occurred_at))` or similar.
