-- Migration: Add last_login column to auth_credentials table
-- Purpose: Track when partners last logged into the system
-- Date: 2026-01-02

-- Add last_login column to auth_credentials table
ALTER TABLE auth_credentials 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add comment to document the column
COMMENT ON COLUMN auth_credentials.last_login IS 'Timestamp of the last successful login for tracking system usage';

-- Create index for better query performance when filtering by last_login
CREATE INDEX IF NOT EXISTS idx_auth_credentials_last_login ON auth_credentials(last_login) WHERE last_login IS NOT NULL;

