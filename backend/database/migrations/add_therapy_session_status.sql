-- Migration: Add status field to therapy_sessions table
-- This allows tracking session status: scheduled, started, completed

-- Add status column to therapy_sessions table
ALTER TABLE therapy_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled' 
CHECK (status IN ('scheduled', 'started', 'completed'));

-- Set default status for existing records
UPDATE therapy_sessions 
SET status = 'scheduled' 
WHERE status IS NULL;

-- Add index on status column for better query performance
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_status ON therapy_sessions(status);

-- Add comment to document the column
COMMENT ON COLUMN therapy_sessions.status IS 'Session status: scheduled (not yet started), started (in progress), completed (finished)';

