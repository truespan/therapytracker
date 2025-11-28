-- Migration: Remove user_profiles and profile_fields Tables
-- Description: Removes the unused user_profiles and profile_fields tables and all references
-- Date: 2025-01-29
--
-- These tables were part of an old sessions-based assessment system that has been replaced
-- with the questionnaires system. No functionality currently uses these tables.
--
-- This migration removes:
-- 1. user_profiles table
-- 2. profile_fields table
-- 3. Related foreign key constraints (CASCADE)
-- 4. Related indexes
--
-- WARNING: This is a destructive operation. Backup your database before running!

-- Step 1: Verify that the tables exist and are empty (or log counts)
DO $$
DECLARE
    profile_fields_count INTEGER;
    user_profiles_count INTEGER;
BEGIN
    -- Check profile_fields count
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profile_fields'
    ) THEN
        SELECT COUNT(*) INTO profile_fields_count FROM profile_fields;
        RAISE NOTICE 'profile_fields table has % records', profile_fields_count;
    ELSE
        RAISE NOTICE 'profile_fields table does not exist';
        profile_fields_count := 0;
    END IF;

    -- Check user_profiles count
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'user_profiles'
    ) THEN
        SELECT COUNT(*) INTO user_profiles_count FROM user_profiles;
        RAISE NOTICE 'user_profiles table has % records', user_profiles_count;
    ELSE
        RAISE NOTICE 'user_profiles table does not exist';
        user_profiles_count := 0;
    END IF;

    -- Warn if data exists
    IF profile_fields_count > 0 OR user_profiles_count > 0 THEN
        RAISE WARNING 'Tables contain data! Total records: profile_fields=%, user_profiles=%',
            profile_fields_count, user_profiles_count;
        RAISE NOTICE 'Proceeding with deletion...';
    END IF;
END $$;

-- Step 2: Drop indexes related to these tables
DROP INDEX IF EXISTS idx_user_profiles_user;
DROP INDEX IF EXISTS idx_user_profiles_session;
DROP INDEX IF EXISTS idx_profile_fields_user_session;
DROP INDEX IF EXISTS idx_profile_fields_session;

-- Step 3: Drop foreign key constraints on profile_fields (if they exist)
-- Note: Constraints added by fix_profile_fields_constraints.sql migration
DO $$
BEGIN
    -- Drop FK constraint for created_by_partner_id
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_profile_fields_created_by_partner'
        AND table_name = 'profile_fields'
    ) THEN
        ALTER TABLE profile_fields DROP CONSTRAINT fk_profile_fields_created_by_partner;
        RAISE NOTICE 'Dropped FK constraint: fk_profile_fields_created_by_partner';
    END IF;

    -- Drop FK constraint for created_by_user_id
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_profile_fields_created_by_user'
        AND table_name = 'profile_fields'
    ) THEN
        ALTER TABLE profile_fields DROP CONSTRAINT fk_profile_fields_created_by_user;
        RAISE NOTICE 'Dropped FK constraint: fk_profile_fields_created_by_user';
    END IF;
END $$;

-- Step 4: Drop user_profiles table (CASCADE handles dependent FK constraints)
DROP TABLE IF EXISTS user_profiles CASCADE;
RAISE NOTICE 'Dropped user_profiles table';

-- Step 5: Drop profile_fields table (CASCADE handles dependent FK constraints)
DROP TABLE IF EXISTS profile_fields CASCADE;
RAISE NOTICE 'Dropped profile_fields table';

-- Step 6: Verify the migration
DO $$
BEGIN
    -- Check if user_profiles table still exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'user_profiles'
    ) THEN
        RAISE EXCEPTION 'user_profiles table still exists after migration!';
    END IF;

    -- Check if profile_fields table still exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profile_fields'
    ) THEN
        RAISE EXCEPTION 'profile_fields table still exists after migration!';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Removed tables: user_profiles, profile_fields';
    RAISE NOTICE 'These tables were part of the old sessions-based assessment system';
    RAISE NOTICE 'The new questionnaires system is now the only assessment method';
    RAISE NOTICE '========================================';
END $$;
