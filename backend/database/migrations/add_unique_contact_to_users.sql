-- ============================================================================
-- Migration: Add Unique Constraint to Users Contact Field
-- ============================================================================
-- This migration adds a UNIQUE constraint to the contact field in the users table
-- to ensure no two users can have the same mobile number, as it's used as login username
-- ============================================================================

-- First, check for and handle any duplicate contacts
-- This will keep the first occurrence and log duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT contact, COUNT(*) as cnt
        FROM users
        GROUP BY contact
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate contact numbers. Please resolve duplicates before applying unique constraint.', duplicate_count;
        -- In production, you may want to handle duplicates differently
        -- For now, we'll raise an exception to prevent migration if duplicates exist
        RAISE EXCEPTION 'Cannot add unique constraint: duplicate contact numbers exist. Please resolve duplicates first.';
    END IF;
END $$;

-- Add unique constraint to contact field
ALTER TABLE users 
ADD CONSTRAINT users_contact_unique UNIQUE (contact);

-- Add index for better query performance (unique constraint already creates an index, but we can add a comment)
COMMENT ON CONSTRAINT users_contact_unique ON users IS 'Ensures mobile numbers are unique across all users as they are used for login';

