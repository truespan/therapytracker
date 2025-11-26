-- Migration: Add Video Session Tracking to Therapy Sessions
-- Description: Adds video_session_id field to track sessions created from video sessions
-- Date: 2025-01-26

-- Add video_session_id column to therapy_sessions table
ALTER TABLE therapy_sessions
  ADD COLUMN IF NOT EXISTS video_session_id INTEGER REFERENCES video_sessions(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_video_session
ON therapy_sessions(video_session_id);

-- Add comment for documentation
COMMENT ON COLUMN therapy_sessions.video_session_id IS 'Reference to the video session this therapy session was created from (if applicable)';
