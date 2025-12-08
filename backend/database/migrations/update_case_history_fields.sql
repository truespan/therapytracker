-- Migration to update case history fields
-- 1. Combine consanguinity fields into one
-- 2. Keep expressed emotion fields as-is (they're already TEXT)

-- Add new consanguinity field
ALTER TABLE case_histories ADD COLUMN IF NOT EXISTS family_history_consanguinity TEXT;

-- Copy data from the present field if it exists
UPDATE case_histories
SET family_history_consanguinity = family_history_consanguinity_present
WHERE family_history_consanguinity_present IS NOT NULL AND family_history_consanguinity_present != '';

-- Copy data from the absent field if the new field is still empty
UPDATE case_histories
SET family_history_consanguinity = family_history_consanguinity_absent
WHERE (family_history_consanguinity IS NULL OR family_history_consanguinity = '')
  AND family_history_consanguinity_absent IS NOT NULL
  AND family_history_consanguinity_absent != '';

-- Drop the old columns
ALTER TABLE case_histories DROP COLUMN IF EXISTS family_history_consanguinity_present;
ALTER TABLE case_histories DROP COLUMN IF EXISTS family_history_consanguinity_absent;

-- Note: The expressed emotion fields are already TEXT type, so no changes needed for those
