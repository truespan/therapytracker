-- Migration: Add google_drive_link column to therapy_sessions table
-- Description: Adds google_drive_link column to store Google Drive file links for therapy sessions
-- Date: 2025-01-28

-- Add google_drive_link column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'therapy_sessions' 
        AND column_name = 'google_drive_link'
    ) THEN
        ALTER TABLE therapy_sessions ADD COLUMN google_drive_link TEXT;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN therapy_sessions.google_drive_link IS 'Google Drive link to files associated with this therapy session';


