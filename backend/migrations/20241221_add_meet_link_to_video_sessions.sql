-- Migration: Add meet_link column to video_sessions table
-- This migration updates the video_sessions table to support Google Meet integration
-- by replacing the daily_room_url column with meet_link

-- Step 1: Add the new meet_link column
ALTER TABLE video_sessions 
ADD COLUMN IF NOT EXISTS meet_link VARCHAR(500);

-- Step 2: Copy existing daily_room_url data to meet_link for reference
-- (This preserves the old data in case we need to reference it)
UPDATE video_sessions 
SET meet_link = daily_room_url 
WHERE daily_room_url IS NOT NULL 
AND meet_link IS NULL;

-- Step 3: Drop the daily_room_url column
ALTER TABLE video_sessions 
DROP COLUMN IF EXISTS daily_room_url;

-- Step 4: Add index for better performance on meet_link lookups
CREATE INDEX IF NOT EXISTS idx_video_sessions_meet_link 
ON video_sessions(meet_link);

-- Step 5: Update comments for documentation
COMMENT ON COLUMN video_sessions.meet_link IS 'Google Meet link for the video session, generated via Google Calendar API';

-- Verification query (can be run separately to verify the migration)
/*
SELECT 
    id,
    title,
    meeting_room_id,
    meet_link,
    google_event_id,
    session_date
FROM video_sessions 
WHERE meet_link IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
*/

-- Rollback script (if needed)
/*
-- Add back the daily_room_url column
ALTER TABLE video_sessions 
ADD COLUMN IF NOT EXISTS daily_room_url VARCHAR(500);

-- Copy meet_link data back to daily_room_url
UPDATE video_sessions 
SET daily_room_url = meet_link 
WHERE meet_link IS NOT NULL 
AND daily_room_url IS NULL;

-- Drop the meet_link column
ALTER TABLE video_sessions 
DROP COLUMN IF EXISTS meet_link;

-- Drop the index
DROP INDEX IF EXISTS idx_video_sessions_meet_link;
*/