-- Migration: Add video_sessions_enabled feature toggle to organizations
-- This allows admins to enable/disable video session functionality per organization

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS video_sessions_enabled BOOLEAN DEFAULT TRUE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_video_sessions_enabled
ON organizations(video_sessions_enabled);

-- Add comment to document the column
COMMENT ON COLUMN organizations.video_sessions_enabled IS
'Whether video session functionality is enabled for this organization';

-- Update existing organizations to have video sessions enabled by default
UPDATE organizations
SET video_sessions_enabled = TRUE
WHERE video_sessions_enabled IS NULL;
