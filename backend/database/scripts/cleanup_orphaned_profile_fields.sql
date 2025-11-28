-- Cleanup script for orphaned profile_fields
--
-- This script removes profile_fields that reference deleted partners or users
-- in their created_by_partner_id or created_by_user_id columns.
--
-- These orphaned records exist because the columns don't have foreign key
-- constraints with CASCADE delete.
--
-- Run this BEFORE running the migration that adds foreign key constraints.
--
-- Usage:
--   psql -U your_username -d therapy_tracker -f cleanup_orphaned_profile_fields.sql

BEGIN;

-- Step 1: Show orphaned profile_fields created by deleted partners
SELECT
    pf.id,
    pf.field_name,
    pf.field_type,
    pf.category,
    pf.is_default,
    pf.created_by_partner_id,
    pf.user_id,
    pf.created_at
FROM profile_fields pf
WHERE pf.created_by_partner_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id
)
ORDER BY pf.created_at DESC;

-- Step 2: Count orphaned profile_fields by type
SELECT
    'Created by deleted partners' as orphan_type,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.created_by_partner_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id
)
UNION ALL
SELECT
    'Created by deleted users' as orphan_type,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.created_by_user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = pf.created_by_user_id
)
UNION ALL
SELECT
    'Assigned to deleted users (via user_id)' as orphan_type,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = pf.user_id
)
UNION ALL
SELECT
    'Assigned to deleted sessions' as orphan_type,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.session_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = pf.session_id
);

-- Step 3: Delete profile_fields created by deleted partners (non-default only)
-- We keep default fields as they're system-wide
DELETE FROM profile_fields
WHERE created_by_partner_id IS NOT NULL
AND is_default = false
AND created_by_partner_id NOT IN (SELECT id FROM partners);

-- Step 4: Delete profile_fields created by deleted users
DELETE FROM profile_fields
WHERE created_by_user_id IS NOT NULL
AND created_by_user_id NOT IN (SELECT id FROM users);

-- Step 5: Delete profile_fields assigned to deleted users (via user_id)
-- These should have been cascade deleted but might exist due to data issues
DELETE FROM profile_fields
WHERE user_id IS NOT NULL
AND user_id NOT IN (SELECT id FROM users);

-- Step 6: Delete profile_fields assigned to deleted sessions
-- These should have been cascade deleted but might exist due to data issues
DELETE FROM profile_fields
WHERE session_id IS NOT NULL
AND session_id NOT IN (SELECT id FROM sessions);

-- Step 7: Verify cleanup
SELECT
    'Cleanup verification:' as status;

SELECT
    'Orphaned by deleted partners' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ Clean'
        ELSE '✗ Still has orphans'
    END as status
FROM profile_fields pf
WHERE pf.created_by_partner_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id)
UNION ALL
SELECT
    'Orphaned by deleted users (created_by)' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ Clean'
        ELSE '✗ Still has orphans'
    END as status
FROM profile_fields pf
WHERE pf.created_by_user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.created_by_user_id)
UNION ALL
SELECT
    'Orphaned by deleted users (user_id)' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ Clean'
        ELSE '✗ Still has orphans'
    END as status
FROM profile_fields pf
WHERE pf.user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.user_id)
UNION ALL
SELECT
    'Orphaned by deleted sessions' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ Clean'
        ELSE '✗ Still has orphans'
    END as status
FROM profile_fields pf
WHERE pf.session_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = pf.session_id);

COMMIT;

-- Final summary
SELECT
    'Cleanup completed!' as status,
    (SELECT COUNT(*) FROM profile_fields) as total_profile_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE is_default = true) as default_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE is_default = false) as custom_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE created_by_partner_id IS NOT NULL) as partner_created_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE user_id IS NOT NULL) as user_assigned_fields;
