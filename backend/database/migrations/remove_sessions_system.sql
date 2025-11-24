-- Migration: Remove Sessions System
-- Description: Removes the old sessions-based assessment system from the database
-- Date: 2025-01-XX
-- 
-- This migration removes:
-- 1. Sessions table and all related data
-- 2. Session-related foreign keys from profile_fields and user_profiles
-- 3. Session-related indexes
--
-- WARNING: This is a destructive operation. Backup your database before running!

-- Step 1: Remove foreign key constraints that reference sessions
-- Note: PostgreSQL will handle CASCADE automatically when we drop the sessions table

-- Step 2: Remove session_id column from profile_fields table
-- First check if the column exists to make this migration idempotent
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_fields' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE profile_fields DROP COLUMN session_id;
        RAISE NOTICE 'Dropped session_id column from profile_fields';
    ELSE
        RAISE NOTICE 'session_id column does not exist in profile_fields, skipping';
    END IF;
END $$;

-- Step 3: Remove session_id column from user_profiles table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE user_profiles DROP COLUMN session_id;
        RAISE NOTICE 'Dropped session_id column from user_profiles';
    ELSE
        RAISE NOTICE 'session_id column does not exist in user_profiles, skipping';
    END IF;
END $$;

-- Step 4: Drop indexes related to sessions
DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_partner;
DROP INDEX IF EXISTS idx_user_profiles_session;
DROP INDEX IF EXISTS idx_profile_fields_session;
DROP INDEX IF EXISTS idx_profile_fields_user_session;

-- Step 5: Drop the sessions table (CASCADE will handle dependent objects)
DROP TABLE IF EXISTS sessions CASCADE;

-- Step 6: Verify the migration
DO $$ 
BEGIN
    -- Check if sessions table still exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'sessions'
    ) THEN
        RAISE EXCEPTION 'Sessions table still exists after migration!';
    END IF;
    
    -- Check if session_id columns still exist
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name IN ('profile_fields', 'user_profiles') 
        AND column_name = 'session_id'
    ) THEN
        RAISE EXCEPTION 'session_id columns still exist after migration!';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Sessions table and all related data have been removed';
END $$;





