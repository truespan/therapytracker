-- Migration: Add video_sessions_enabled column to partners table
-- Description: Allows organizations to enable/disable video sessions for individual therapists
-- Date: 2025-12-21

-- Add video_sessions_enabled column to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS video_sessions_enabled BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_partners_video_sessions_enabled ON partners(video_sessions_enabled);

-- Add comment to document the column
COMMENT ON COLUMN partners.video_sessions_enabled IS 'Controls whether individual therapist can use video sessions. Only applicable for theraptrack_controlled organizations.';

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name = 'video_sessions_enabled';

-- Update existing partners to have video sessions enabled by default
UPDATE partners 
SET video_sessions_enabled = true 
WHERE video_sessions_enabled IS NULL;

-- Verify the update
SELECT id, name, email, video_sessions_enabled 
FROM partners 
WHERE video_sessions_enabled = true 
LIMIT 5;