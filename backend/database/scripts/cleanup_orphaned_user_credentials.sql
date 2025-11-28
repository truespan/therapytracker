-- Cleanup script for orphaned user authentication credentials
--
-- This script removes auth credentials for users that no longer exist in the users table.
-- This can happen if organizations were deleted before the fix that properly cleans up
-- user credentials during organization deletion.
--
-- Run this script if you had organizations/partners/users before the fix was applied.
--
-- Usage:
--   psql -U your_username -d therapy_tracker -f cleanup_orphaned_user_credentials.sql

-- Step 1: Show orphaned user credentials (for review before deletion)
SELECT
    ac.id as auth_id,
    ac.user_type,
    ac.reference_id as user_id,
    ac.email,
    ac.created_at
FROM auth_credentials ac
WHERE ac.user_type = 'user'
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = ac.reference_id
);

-- If the above query returns results, those are orphaned credentials that will be deleted

-- Step 2: Count orphaned credentials
SELECT
    COUNT(*) as orphaned_user_credentials_count
FROM auth_credentials ac
WHERE ac.user_type = 'user'
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = ac.reference_id
);

-- Step 3: Delete orphaned user credentials
DELETE FROM auth_credentials
WHERE user_type = 'user'
AND reference_id NOT IN (SELECT id FROM users);

-- Step 4: Verify cleanup
SELECT
    user_type,
    COUNT(*) as count
FROM auth_credentials
GROUP BY user_type
ORDER BY user_type;

-- Step 5: Also check for orphaned partner credentials (just in case)
SELECT
    COUNT(*) as orphaned_partner_credentials_count
FROM auth_credentials ac
WHERE ac.user_type = 'partner'
AND NOT EXISTS (
    SELECT 1 FROM partners p WHERE p.id = ac.reference_id
);

-- Step 6: Delete orphaned partner credentials if any
DELETE FROM auth_credentials
WHERE user_type = 'partner'
AND reference_id NOT IN (SELECT id FROM partners);

-- Step 7: Check for orphaned organization credentials
SELECT
    COUNT(*) as orphaned_organization_credentials_count
FROM auth_credentials ac
WHERE ac.user_type = 'organization'
AND NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = ac.reference_id
);

-- Step 8: Delete orphaned organization credentials if any
DELETE FROM auth_credentials
WHERE user_type = 'organization'
AND reference_id NOT IN (SELECT id FROM organizations);

-- Final report
SELECT
    'Cleanup completed!' as status,
    (SELECT COUNT(*) FROM auth_credentials WHERE user_type = 'user') as remaining_user_credentials,
    (SELECT COUNT(*) FROM auth_credentials WHERE user_type = 'partner') as remaining_partner_credentials,
    (SELECT COUNT(*) FROM auth_credentials WHERE user_type = 'organization') as remaining_organization_credentials;
