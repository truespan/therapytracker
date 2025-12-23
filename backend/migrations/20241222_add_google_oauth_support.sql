-- Migration: Add Google OAuth support to auth_credentials table
-- Created: 2024-12-22

-- Add Google OAuth columns to auth_credentials table
ALTER TABLE auth_credentials 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_google_user BOOLEAN DEFAULT FALSE;

-- Make password_hash nullable to support Google users who don't have passwords
ALTER TABLE auth_credentials 
ALTER COLUMN password_hash DROP NOT NULL;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_credentials_google_id 
ON auth_credentials(google_id) 
WHERE google_id IS NOT NULL;

-- Create unique constraint on google_id (only for non-null values)
-- Note: PostgreSQL automatically creates a unique index for unique constraints
ALTER TABLE auth_credentials 
ADD CONSTRAINT auth_credentials_google_id_unique 
UNIQUE (google_id);

-- Add comment to document the changes
COMMENT ON COLUMN auth_credentials.google_id IS 'Google user ID for OAuth authentication';
COMMENT ON COLUMN auth_credentials.is_google_user IS 'Flag indicating if user authenticated via Google OAuth';
COMMENT ON COLUMN auth_credentials.password_hash IS 'Password hash (nullable for Google OAuth users)';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'auth_credentials' 
AND column_name IN ('google_id', 'is_google_user', 'password_hash')
