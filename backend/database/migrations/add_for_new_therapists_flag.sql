-- Migration: Add for_new_therapists flag to organizations
-- This flag designates which TheraPTrack-controlled organization should be used for homepage therapist signups

-- Step 1: Add the for_new_therapists column
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS for_new_therapists BOOLEAN DEFAULT FALSE;

-- Step 2: Create partial unique index - ensures only one org can have for_new_therapists = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_for_new_therapists_unique
ON organizations (for_new_therapists)
WHERE for_new_therapists = true;

-- Step 3: Add check constraint - only theraptrack_controlled orgs can have this flag
ALTER TABLE organizations
ADD CONSTRAINT check_for_new_therapists_requires_theraptrack
CHECK (
  for_new_therapists = false OR 
  (for_new_therapists = true AND theraptrack_controlled = true)
);

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_for_new_therapists ON organizations(for_new_therapists);

-- Step 5: Add comment to document the column
COMMENT ON COLUMN organizations.for_new_therapists IS 'Designates if this TheraPTrack-controlled organization should be used for homepage therapist signups. Only one organization can have this flag set to true at a time.';

