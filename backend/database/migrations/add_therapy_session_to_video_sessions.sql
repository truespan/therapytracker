-- Migration: Add therapy_session_id to video_sessions table
-- Description: Allows linking video sessions to existing therapy sessions (reverse direction)
-- Date: 2025-01-29

-- Add therapy_session_id column to video_sessions table
ALTER TABLE video_sessions
  ADD COLUMN IF NOT EXISTS therapy_session_id INTEGER REFERENCES therapy_sessions(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_video_sessions_therapy_session
ON video_sessions(therapy_session_id);

-- Add comment for documentation
COMMENT ON COLUMN video_sessions.therapy_session_id IS 'Reference to the therapy session this video session was created for (if applicable). This is the reverse direction - when a video session is scheduled for an existing therapy session.';

