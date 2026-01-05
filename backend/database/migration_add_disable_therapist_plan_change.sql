-- Migration: Add disable_therapist_plan_change column to organizations table
-- Description: Allows TheraPTrack-controlled organizations to disable the "Change Plan" button for therapists in Subscription Management tab
-- Date: 2025-01-XX

-- Add disable_therapist_plan_change column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS disable_therapist_plan_change BOOLEAN DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN organizations.disable_therapist_plan_change IS 'Controls whether therapists can change their subscription plans. Only applicable for theraptrack_controlled organizations.';

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name = 'disable_therapist_plan_change';

-- Update existing organizations to have plan change enabled by default
UPDATE organizations 
SET disable_therapist_plan_change = false 
WHERE disable_therapist_plan_change IS NULL;

