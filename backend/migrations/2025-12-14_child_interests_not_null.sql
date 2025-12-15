-- 1) Ensure column exists and is non-null with a default
ALTER TABLE children
  ALTER COLUMN interests SET DEFAULT '[]'::jsonb;

UPDATE children
SET interests = COALESCE(interests, '[]'::jsonb)
WHERE interests IS NULL;

ALTER TABLE children
  ALTER COLUMN interests SET NOT NULL;

-- 2) Enforce at least one entry
ALTER TABLE children
ADD CONSTRAINT children_interests_min_1
CHECK (jsonb_typeof(interests) = 'array' AND jsonb_array_length(interests) >= 1);