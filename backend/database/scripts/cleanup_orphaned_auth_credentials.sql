-- Cleanup script for orphaned auth_credentials
-- This script removes auth_credentials that reference deleted partners or organizations

-- Find orphaned partner auth credentials (partners that don't exist)
SELECT
    ac.id,
    ac.email,
    ac.user_type,
    ac.reference_id,
    'Orphaned - Partner does not exist' as status
FROM auth_credentials ac
WHERE ac.user_type = 'partner'
  AND NOT EXISTS (
      SELECT 1 FROM partners p WHERE p.id = ac.reference_id
  );

-- Find orphaned organization auth credentials (organizations that don't exist)
SELECT
    ac.id,
    ac.email,
    ac.user_type,
    ac.reference_id,
    'Orphaned - Organization does not exist' as status
FROM auth_credentials ac
WHERE ac.user_type = 'organization'
  AND NOT EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = ac.reference_id
  );

-- Find orphaned user auth credentials (users that don't exist)
SELECT
    ac.id,
    ac.email,
    ac.user_type,
    ac.reference_id,
    'Orphaned - User does not exist' as status
FROM auth_credentials ac
WHERE ac.user_type = 'user'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.id = ac.reference_id
  );

-- DELETE orphaned partner auth credentials
DELETE FROM auth_credentials
WHERE user_type = 'partner'
  AND NOT EXISTS (
      SELECT 1 FROM partners p WHERE p.id = auth_credentials.reference_id
  );

-- DELETE orphaned organization auth credentials
DELETE FROM auth_credentials
WHERE user_type = 'organization'
  AND NOT EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = auth_credentials.reference_id
  );

-- DELETE orphaned user auth credentials
DELETE FROM auth_credentials
WHERE user_type = 'user'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth_credentials.reference_id
  );

-- Show summary of remaining auth credentials
SELECT
    user_type,
    COUNT(*) as count
FROM auth_credentials
GROUP BY user_type
ORDER BY user_type;
