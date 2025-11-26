-- Migration: Add therapy_sessions table
-- Description: Creates therapy_sessions table to track therapy session records created from appointments
-- Date: 2025-01-26

-- Create therapy_sessions table
CREATE TABLE IF NOT EXISTS therapy_sessions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_title VARCHAR(255) NOT NULL,
    session_notes TEXT,
    payment_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_appointment ON therapy_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_partner ON therapy_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user ON therapy_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_created ON therapy_sessions(created_at);

-- Create unique constraint to ensure one session per appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_sessions_unique_appointment
ON therapy_sessions(appointment_id);

-- Add comments for documentation
COMMENT ON TABLE therapy_sessions IS 'Therapy session records created from appointments';
COMMENT ON COLUMN therapy_sessions.appointment_id IS 'Reference to the appointment this session was created from';
COMMENT ON COLUMN therapy_sessions.partner_id IS 'Reference to the therapist/partner who conducted the session';
COMMENT ON COLUMN therapy_sessions.user_id IS 'Reference to the client/user who attended the session';
COMMENT ON COLUMN therapy_sessions.session_title IS 'Title/subject of the therapy session';
COMMENT ON COLUMN therapy_sessions.session_notes IS 'Therapist notes about the session content and observations';
COMMENT ON COLUMN therapy_sessions.payment_notes IS 'Payment-related information and notes';
