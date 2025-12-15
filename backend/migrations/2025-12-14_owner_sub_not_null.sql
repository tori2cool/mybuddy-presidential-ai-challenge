-- Migration: enforce NOT NULL on children.owner_sub
--
-- Assumes `owner_sub` column already exists (added in prior migration).

ALTER TABLE children ALTER COLUMN owner_sub SET NOT NULL;
