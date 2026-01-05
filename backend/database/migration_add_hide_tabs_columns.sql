-- Migration: Add hide_therapists_tab and hide_questionnaires_tab columns to organizations table
-- Description: Allows TheraPTrack-controlled organizations to hide Therapists Management and Questionnaires tabs
-- Date: 2025-01-XX

-- Add hide_therapists_tab column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS hide_therapists_tab BOOLEAN DEFAULT false;

-- Add hide_questionnaires_tab column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS hide_questionnaires_tab BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN organizations.hide_therapists_tab IS 'Controls visibility of Therapists Management tab. Only applicable for theraptrack_controlled organizations.';
COMMENT ON COLUMN organizations.hide_questionnaires_tab IS 'Controls visibility of Questionnaires tab. Only applicable for theraptrack_controlled organizations.';

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('hide_therapists_tab', 'hide_questionnaires_tab');

-- Update existing organizations to have tabs visible by default
UPDATE organizations 
SET hide_therapists_tab = false 
WHERE hide_therapists_tab IS NULL;

UPDATE organizations 
SET hide_questionnaires_tab = false 
WHERE hide_questionnaires_tab IS NULL;

