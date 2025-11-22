-- Migration: Add video_sessions table for video conferencing feature
-- This allows partners to schedule 1-to-1 video sessions with their clients

-- Create video_sessions table
CREATE TABLE IF NOT EXISTS video_sessions (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    session_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_room_id VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255), -- Hashed password for session access
    password_enabled BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_sessions_partner ON video_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_user ON video_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_date ON video_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_meeting_room ON video_sessions(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_partner_user ON video_sessions(partner_id, user_id);

-- Add comment to document the table
COMMENT ON TABLE video_sessions IS 'Stores video conferencing sessions between partners and clients using Jitsi';
COMMENT ON COLUMN video_sessions.meeting_room_id IS 'Unique identifier for the Jitsi meeting room';
COMMENT ON COLUMN video_sessions.password IS 'Hashed password for session access (if password_enabled is true)';
COMMENT ON COLUMN video_sessions.password_enabled IS 'Whether password protection is enabled for this session';

