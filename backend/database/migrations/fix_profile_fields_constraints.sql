-- Migration: Add foreign key constraints to profile_fields
--
-- This fixes the issue where profile_fields created by partners remain
-- orphaned in the database after partners are deleted.
--
-- The created_by_partner_id and created_by_user_id columns currently
-- have no foreign key constraints, so deletions don't cascade properly.
--
-- Usage:
--   psql -U your_username -d therapy_tracker -f fix_profile_fields_constraints.sql

BEGIN;

-- Step 1: Clean up orphaned records first (optional, but recommended)
-- Delete profile_fields where created_by_partner_id references non-existent partners
DELETE FROM profile_fields
WHERE created_by_partner_id IS NOT NULL
AND created_by_partner_id NOT IN (SELECT id FROM partners);

-- Delete profile_fields where created_by_user_id references non-existent users
DELETE FROM profile_fields
WHERE created_by_user_id IS NOT NULL
AND created_by_user_id NOT IN (SELECT id FROM users);

-- Step 2: Add foreign key constraint for created_by_partner_id
-- This ensures profile_fields are deleted when the partner who created them is deleted
ALTER TABLE profile_fields
ADD CONSTRAINT fk_profile_fields_created_by_partner
FOREIGN KEY (created_by_partner_id)
REFERENCES partners(id)
ON DELETE CASCADE;

-- Step 3: Add foreign key constraint for created_by_user_id
-- This ensures profile_fields are deleted when the user who created them is deleted
ALTER TABLE profile_fields
ADD CONSTRAINT fk_profile_fields_created_by_user
FOREIGN KEY (created_by_user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Step 4: Add comments for documentation
COMMENT ON CONSTRAINT fk_profile_fields_created_by_partner ON profile_fields IS
'Cascade delete profile fields when the partner who created them is deleted';

COMMENT ON CONSTRAINT fk_profile_fields_created_by_user ON profile_fields IS
'Cascade delete profile fields when the user who created them is deleted';

-- Step 5: Verify constraints were added
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profile_fields'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

COMMIT;

-- Final summary
SELECT
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM profile_fields) as total_profile_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE is_default = true) as default_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE is_default = false) as custom_fields,
    (SELECT COUNT(*) FROM profile_fields WHERE created_by_partner_id IS NOT NULL) as partner_created_fields;
