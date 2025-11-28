-- Cleanup script for orphaned users and their auth credentials
--
-- This script removes users who have no partner assignments (orphaned users).
-- When organizations are deleted, partners are deleted, but users who were
-- assigned to those partners remain in the database.
--
-- This script will:
-- 1. Find users with no partner assignments
-- 2. Delete their auth credentials
-- 3. Delete the user records themselves
--
-- Run this if organizations were deleted before the complete fix was applied.
--
-- Usage:
--   psql -U your_username -d therapy_tracker -f cleanup_orphaned_users.sql

BEGIN;

-- Step 1: Show orphaned users (users with no partner assignments)
SELECT
    u.id as user_id,
    u.name,
    u.email,
    u.contact,
    u.created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
)
ORDER BY u.created_at DESC;

-- Step 2: Count orphaned users
SELECT
    COUNT(*) as orphaned_users_count,
    'These users have no partner assignments and will be deleted' as note
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
);

-- Step 3: Show auth credentials that will be deleted
SELECT
    ac.id as auth_id,
    ac.email,
    ac.reference_id as user_id,
    ac.created_at
FROM auth_credentials ac
WHERE ac.user_type = 'user'
AND ac.reference_id IN (
    SELECT u.id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
    )
);

-- Step 4: Delete auth credentials for orphaned users
DELETE FROM auth_credentials
WHERE user_type = 'user'
AND reference_id IN (
    SELECT u.id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
    )
);

-- Step 5: Delete orphaned users
-- This will CASCADE delete:
-- - sessions
-- - profile_fields
-- - user_partner_assignments (if any remain)
-- - questionnaire_responses
-- - any other related data
DELETE FROM users
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM user_partner_assignments
);

-- Step 6: Verify cleanup
SELECT
    'Cleanup completed!' as status,
    (SELECT COUNT(*) FROM users) as remaining_users,
    (SELECT COUNT(*) FROM auth_credentials WHERE user_type = 'user') as remaining_user_credentials,
    (SELECT COUNT(*) FROM user_partner_assignments) as remaining_assignments;

-- Step 7: Verify no orphaned credentials remain
SELECT
    COUNT(*) as orphaned_credentials_count,
    CASE
        WHEN COUNT(*) = 0 THEN 'All orphaned credentials cleaned up!'
        ELSE 'WARNING: Some orphaned credentials still exist'
    END as status
FROM auth_credentials ac
WHERE ac.user_type = 'user'
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = ac.reference_id
);

-- Step 8: Verify no orphaned users remain
SELECT
    COUNT(*) as orphaned_users_count,
    CASE
        WHEN COUNT(*) = 0 THEN 'All orphaned users cleaned up!'
        ELSE 'WARNING: Some orphaned users still exist'
    END as status
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
);

COMMIT;

-- Final summary
SELECT
    'Database cleanup summary:' as title;

SELECT
    'Total Users' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT
    'Total User Credentials' as metric,
    COUNT(*) as count
FROM auth_credentials WHERE user_type = 'user'
UNION ALL
SELECT
    'Total User-Partner Assignments' as metric,
    COUNT(*) as count
FROM user_partner_assignments
UNION ALL
SELECT
    'Total Partners' as metric,
    COUNT(*) as count
FROM partners
UNION ALL
SELECT
    'Total Organizations' as metric,
    COUNT(*) as count
FROM organizations;
