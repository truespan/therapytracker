-- Google Calendar Integration Migration
-- Adds support for Google Calendar OAuth tokens and event synchronization
-- Created: 2025-12-05

-- ==================== CREATE GOOGLE CALENDAR TOKENS TABLE ====================
-- Stores encrypted OAuth tokens for users who connect their Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user', 'partner')),
    user_id INTEGER NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    calendar_id VARCHAR(255) DEFAULT 'primary',
    sync_enabled BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_type, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_user ON google_calendar_tokens(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_sync_enabled ON google_calendar_tokens(sync_enabled);

-- Add comments
COMMENT ON TABLE google_calendar_tokens IS 'Stores encrypted Google Calendar OAuth tokens for users and partners';
COMMENT ON COLUMN google_calendar_tokens.user_type IS 'Type of user: user (client) or partner (therapist)';
COMMENT ON COLUMN google_calendar_tokens.user_id IS 'Foreign key to users or partners table based on user_type';
COMMENT ON COLUMN google_calendar_tokens.encrypted_access_token IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN google_calendar_tokens.encrypted_refresh_token IS 'AES-256-GCM encrypted refresh token';
COMMENT ON COLUMN google_calendar_tokens.token_expires_at IS 'Expiration timestamp for access token';
COMMENT ON COLUMN google_calendar_tokens.calendar_id IS 'Google Calendar ID (default: primary)';
COMMENT ON COLUMN google_calendar_tokens.sync_enabled IS 'Whether sync is currently enabled';

-- ==================== ADD GOOGLE CALENDAR FIELDS TO APPOINTMENTS ====================
-- Track Google Calendar sync status for appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_sync_status VARCHAR(20) DEFAULT 'pending'
    CHECK (google_sync_status IN ('pending', 'synced', 'failed', 'not_synced')),
ADD COLUMN IF NOT EXISTS google_last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS google_sync_error TEXT;

-- Create indexes for sync status queries
CREATE INDEX IF NOT EXISTS idx_appointments_google_event ON appointments(google_event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_google_sync_status ON appointments(google_sync_status);

-- Add comments
COMMENT ON COLUMN appointments.google_event_id IS 'Google Calendar event ID for synced appointments';
COMMENT ON COLUMN appointments.google_sync_status IS 'Sync status: pending (not yet synced), synced (successful), failed (error occurred), not_synced (sync disabled or no Google connection)';
COMMENT ON COLUMN appointments.google_last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN appointments.google_sync_error IS 'Error message if sync failed';

-- ==================== ADD GOOGLE CALENDAR FIELDS TO VIDEO SESSIONS ====================
-- Track Google Calendar sync status for video sessions
ALTER TABLE video_sessions
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_sync_status VARCHAR(20) DEFAULT 'pending'
    CHECK (google_sync_status IN ('pending', 'synced', 'failed', 'not_synced')),
ADD COLUMN IF NOT EXISTS google_last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS google_sync_error TEXT;

-- Create indexes for sync status queries
CREATE INDEX IF NOT EXISTS idx_video_sessions_google_event ON video_sessions(google_event_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_google_sync_status ON video_sessions(google_sync_status);

-- Add comments
COMMENT ON COLUMN video_sessions.google_event_id IS 'Google Calendar event ID for synced video sessions';
COMMENT ON COLUMN video_sessions.google_sync_status IS 'Sync status: pending (not yet synced), synced (successful), failed (error occurred), not_synced (sync disabled or no Google connection)';
COMMENT ON COLUMN video_sessions.google_last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN video_sessions.google_sync_error IS 'Error message if sync failed';

-- ==================== MIGRATION COMPLETE ====================
-- Migration adds Google Calendar integration support to the theraP track application
-- Next steps:
-- 1. Run this migration on the database
-- 2. Configure Google Cloud Console OAuth credentials
-- 3. Add environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY
-- 4. Install googleapis npm package
-- 5. Implement backend services and controllers
