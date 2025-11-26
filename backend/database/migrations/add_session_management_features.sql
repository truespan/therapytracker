-- Migration: Add Session Management Features
-- Description: Enable standalone sessions, session-questionnaire linking, and independent session dates
-- Date: 2025-01-26

-- 1. Make appointment_id nullable to allow standalone sessions
ALTER TABLE therapy_sessions ALTER COLUMN appointment_id DROP NOT NULL;

-- 2. Add session_date and session_duration fields
ALTER TABLE therapy_sessions
  ADD COLUMN IF NOT EXISTS session_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS session_duration INTEGER;

-- 3. Backfill session_date from existing appointments
UPDATE therapy_sessions ts
SET session_date = a.appointment_date,
    session_duration = a.duration_minutes
FROM appointments a
WHERE ts.appointment_id = a.id AND ts.session_date IS NULL;

-- 4. Make session_date NOT NULL after backfill
ALTER TABLE therapy_sessions ALTER COLUMN session_date SET NOT NULL;

-- 5. Create junction table for session-questionnaire linking
CREATE TABLE IF NOT EXISTS session_questionnaire_assignments (
    id SERIAL PRIMARY KEY,
    therapy_session_id INTEGER NOT NULL REFERENCES therapy_sessions(id) ON DELETE CASCADE,
    user_questionnaire_assignment_id INTEGER NOT NULL REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapy_session_id, user_questionnaire_assignment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_questionnaire_session
ON session_questionnaire_assignments(therapy_session_id);

CREATE INDEX IF NOT EXISTS idx_session_questionnaire_assignment
ON session_questionnaire_assignments(user_questionnaire_assignment_id);

-- 6. Fix foreign key in user_questionnaire_responses
-- Drop the old incorrect foreign key if it exists
ALTER TABLE user_questionnaire_responses
  DROP CONSTRAINT IF EXISTS user_questionnaire_responses_session_id_fkey;

-- Add correct foreign key referencing therapy_sessions
ALTER TABLE user_questionnaire_responses
  ADD CONSTRAINT user_questionnaire_responses_therapy_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES therapy_sessions(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON TABLE session_questionnaire_assignments IS 'Links therapy sessions to questionnaire assignments';
COMMENT ON COLUMN therapy_sessions.session_date IS 'Date and time when the therapy session occurred (independent of appointment)';
COMMENT ON COLUMN therapy_sessions.session_duration IS 'Duration of the session in minutes';
COMMENT ON COLUMN session_questionnaire_assignments.therapy_session_id IS 'Reference to the therapy session';
COMMENT ON COLUMN session_questionnaire_assignments.user_questionnaire_assignment_id IS 'Reference to the questionnaire assignment sent to the client';
