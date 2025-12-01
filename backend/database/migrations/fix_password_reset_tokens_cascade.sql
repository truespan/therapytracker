-- Migration: Fix password reset tokens cascade delete
-- This adds a foreign key constraint to ensure password reset tokens
-- are automatically deleted when users are deleted

-- Step 1: First, clean up any orphaned password reset tokens
-- (tokens for emails that don't exist in auth_credentials)
DELETE FROM password_reset_tokens
WHERE email NOT IN (SELECT email FROM auth_credentials);

-- Step 2: Add foreign key constraint
-- This will ensure that when an auth_credentials record is deleted,
-- all associated password reset tokens are automatically deleted
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT fk_password_reset_email
  FOREIGN KEY (email)
  REFERENCES auth_credentials(email)
  ON DELETE CASCADE;

-- Add comment to document the constraint
COMMENT ON CONSTRAINT fk_password_reset_email ON password_reset_tokens IS
  'Cascade delete password reset tokens when auth credentials are deleted';
