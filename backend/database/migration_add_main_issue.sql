-- Migration: Add main_issue field to sessions table
-- This field stores the user's key issues description for each session

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS main_issue TEXT;

-- Add comment to document the field
COMMENT ON COLUMN sessions.main_issue IS 'User-provided description of key issues for this session (max 200 words)';

