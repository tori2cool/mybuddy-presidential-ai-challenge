-- Migration: add per-user ownership to children
--
-- This repo does not currently use Alembic; migrations are provided as
-- raw SQL for manual application.
--
-- Goal:
--  - Add `owner_sub` to `children`
--  - Ensure not-null (after backfill)
--  - Add index (owner_sub, created_at) for list endpoint
--
-- IMPORTANT: If you already have rows in `children`, you must backfill
-- `owner_sub` before enforcing NOT NULL. If you cannot infer ownership,
-- set a placeholder and ask users to recreate profiles.

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS owner_sub varchar(255);

-- Optional backfill example (choose ONE approach):
-- 1) If this is a single-tenant legacy DB, set all existing children to a known owner.
-- UPDATE children SET owner_sub = '<some-keycloak-sub>' WHERE owner_sub IS NULL;
--
-- 2) If you cannot backfill safely, you may temporarily allow NULL and
--    rely on the app to recreate children. Then later delete NULL rows.

-- Enforce NOT NULL after backfill.
-- See `2025-12-14_owner_sub_not_null.sql` (run after backfilling any existing rows).

CREATE INDEX IF NOT EXISTS ix_children_owner_sub_created_at
  ON children (owner_sub, created_at DESC);
