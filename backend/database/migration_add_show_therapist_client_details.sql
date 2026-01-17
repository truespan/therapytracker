-- Migration: Add show_therapist_client_details column to organizations table
-- Description: Allows TheraPTrack-controlled organizations to control whether client details are shown when a therapist is selected in Therapists Management tab
-- Date: 2025-01-XX

-- Add show_therapist_client_details column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS show_therapist_client_details BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN organizations.show_therapist_client_details IS 'Controls whether client details are shown when a therapist is selected in Therapists Management tab. Only applicable for theraptrack_controlled organizations.';

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name = 'show_therapist_client_details';

-- Update existing organizations to show client details by default (backward compatibility)
UPDATE organizations 
SET show_therapist_client_details = true 
WHERE show_therapist_client_details IS NULL;
