-- Migration: Fix therapy_sessions appointment_id cascade behavior
-- Description: Change appointment_id foreign key from ON DELETE CASCADE to ON DELETE SET NULL
--              so that therapy sessions are preserved when appointments are deleted
-- Date: 2025-01-27

-- Drop the existing foreign key constraint
ALTER TABLE therapy_sessions
  DROP CONSTRAINT IF EXISTS therapy_sessions_appointment_id_fkey;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE therapy_sessions
  ADD CONSTRAINT therapy_sessions_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN therapy_sessions.appointment_id IS 'Reference to the appointment this session was created from. Set to NULL when appointment is deleted, but session is preserved.';

