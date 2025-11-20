-- Migration: Add user_id and session_id to profile_fields for session-specific custom fields
-- This allows custom fields to be tied to specific users and sessions

-- Add user_id column (nullable, for custom fields)
ALTER TABLE profile_fields 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add session_id column (nullable, for custom fields)
ALTER TABLE profile_fields 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE;

-- Add index for faster queries on user_id and session_id
CREATE INDEX IF NOT EXISTS idx_profile_fields_user_session ON profile_fields(user_id, session_id);

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_profile_fields_session ON profile_fields(session_id);

-- Note: Existing custom fields will have NULL values for user_id and session_id
-- This is acceptable as they become "orphaned" but won't break the system
-- Default fields (is_default = true) should always have NULL for user_id and session_id

