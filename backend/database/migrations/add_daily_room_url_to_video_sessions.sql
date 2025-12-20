-- Migration: Add daily_room_url column to video_sessions table
-- This stores the complete Daily.co room URL for each session
-- Date: 2025-12-19
-- Purpose: Migrate from Jitsi Meet to Daily.co video SDK

-- Add daily_room_url column (nullable to support existing sessions)
ALTER TABLE video_sessions
ADD COLUMN IF NOT EXISTS daily_room_url VARCHAR(255);

-- Add index for quick lookups by Daily.co URL
CREATE INDEX IF NOT EXISTS idx_video_sessions_daily_room_url
ON video_sessions(daily_room_url);

-- Add comments for documentation
COMMENT ON COLUMN video_sessions.daily_room_url IS 'Daily.co room URL for video session (format: https://{domain}.daily.co/{room-name}). NULL for legacy Jitsi sessions.';

-- Update table comment
COMMENT ON TABLE video_sessions IS 'Stores video conferencing sessions between partners and clients using Daily.co (previously Jitsi Meet)';

-- Update meeting_room_id comment
COMMENT ON COLUMN video_sessions.meeting_room_id IS 'Unique identifier for the meeting room, used as Daily.co room name (format: therapy-{partnerId}-{userId}-{timestamp})';
