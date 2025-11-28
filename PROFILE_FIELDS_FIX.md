# Profile Fields Fix - Complete Cleanup on Deletion

## Issue Description

**Problem**: When deleting organizations/partners, the `profile_fields` table still retains orphaned records. Profile fields created by partners remain in the database even after the partners are deleted.

**Impact**:
- Orphaned profile fields accumulate in the database
- Database integrity is compromised
- New partners don't have access to old profile fields (correct behavior)
- But old data pollutes the database (incorrect - should be cleaned up)

## Root Cause

The `profile_fields` table has columns that reference partners and users but WITHOUT foreign key constraints:

```sql
CREATE TABLE profile_fields (
    created_by_partner_id INTEGER,  -- ❌ No FK constraint!
    created_by_user_id INTEGER,     -- ❌ No FK constraint!
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- ✅ Has CASCADE
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE  -- ✅ Has CASCADE
);
```

**What happens:**
- Profile fields with `user_id` ARE deleted when users are deleted (CASCADE works) ✅
- Profile fields with `session_id` ARE deleted when sessions are deleted (CASCADE works) ✅
- Profile fields with `created_by_partner_id` are NOT deleted when partners are deleted ❌
- Profile fields with `created_by_user_id` are NOT deleted when users are deleted ❌

## Understanding Profile Fields

Profile fields can exist in different states:

1. **Default Fields** (`is_default = true`)
   - System-wide fields available to all users
   - Examples: "Mood", "Energy Level", "Sleep Quality"
   - Should NOT be deleted when partners are deleted
   - No `user_id` or `created_by_partner_id`

2. **Custom Fields Created by Partners** (`is_default = false`, `created_by_partner_id` set)
   - Custom fields created by partners for their clients
   - Example: Partner creates "Anxiety Level" field
   - Should BE deleted when the partner is deleted

3. **User-Assigned Fields** (`user_id` set)
   - Fields assigned to specific users
   - These are instances/values, not definitions
   - Already cascade delete when users are deleted ✅

## The Complete Fix

### 1. Database Migration

Add foreign key constraints with CASCADE delete:

**File**: `backend/database/migrations/fix_profile_fields_constraints.sql`

```sql
-- Add FK constraint for created_by_partner_id
ALTER TABLE profile_fields
ADD CONSTRAINT fk_profile_fields_created_by_partner
FOREIGN KEY (created_by_partner_id)
REFERENCES partners(id)
ON DELETE CASCADE;

-- Add FK constraint for created_by_user_id
ALTER TABLE profile_fields
ADD CONSTRAINT fk_profile_fields_created_by_user
FOREIGN KEY (created_by_user_id)
REFERENCES users(id)
ON DELETE CASCADE;
```

This ensures that when partners/users are deleted, their created profile fields are automatically deleted.

### 2. Updated deleteOrganization Function

**File**: `backend/src/controllers/adminController.js`

Added Step 5 to manually delete profile fields created by partners:

```javascript
// Step 5: Delete profile_fields created by these partners
const deleteProfileFields = await client.query(
  'DELETE FROM profile_fields WHERE created_by_partner_id = ANY($1) AND is_default = false',
  [partnerIds]
);
if (deleteProfileFields.rowCount > 0) {
  console.log(`[ADMIN] Deleted ${deleteProfileFields.rowCount} custom profile fields created by partners`);
}
```

This provides defense-in-depth even before the migration is run.

### 3. Cleanup Scripts for Existing Orphans

Two cleanup scripts to remove existing orphaned profile fields:

- **JavaScript**: `backend/database/scripts/cleanup_orphaned_profile_fields.js`
- **SQL**: `backend/database/scripts/cleanup_orphaned_profile_fields.sql`

## How to Apply the Fix

### Step 1: Clean Up Existing Orphaned Records

Run the cleanup script to remove orphaned profile fields:

```bash
cd backend
npm install

# Run cleanup
DATABASE_URL="your_database_url" node database/scripts/cleanup_orphaned_profile_fields.js
```

Or using SQL:

```bash
psql -U your_username -d therapy_tracker -f backend/database/scripts/cleanup_orphaned_profile_fields.sql
```

This will:
- ✅ Find all orphaned profile fields
- ✅ Delete profile fields created by deleted partners (non-default only)
- ✅ Delete profile fields created by deleted users
- ✅ Delete profile fields assigned to deleted users
- ✅ Delete profile fields assigned to deleted sessions
- ✅ Show detailed report

### Step 2: Run Database Migration

Add the foreign key constraints:

```bash
psql -U your_username -d therapy_tracker -f backend/database/migrations/fix_profile_fields_constraints.sql
```

This will:
- ✅ Clean up any remaining orphans (safety check)
- ✅ Add FK constraint on `created_by_partner_id` with CASCADE
- ✅ Add FK constraint on `created_by_user_id` with CASCADE
- ✅ Verify constraints were added correctly

### Step 3: Deploy Updated Code

Deploy the updated `adminController.js` with the new deletion logic.

### Step 4: Verify the Fix

Check for any remaining orphaned records:

```sql
-- Should return 0
SELECT COUNT(*) as orphaned_by_partners
FROM profile_fields pf
WHERE pf.created_by_partner_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id);

-- Should return 0
SELECT COUNT(*) as orphaned_by_users
FROM profile_fields pf
WHERE pf.created_by_user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.created_by_user_id);

-- Should return 0
SELECT COUNT(*) as orphaned_user_assignments
FROM profile_fields pf
WHERE pf.user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.user_id);

-- Should return 0
SELECT COUNT(*) as orphaned_session_assignments
FROM profile_fields pf
WHERE pf.session_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = pf.session_id);
```

All queries should return **0**.

## Testing

### Test Case 1: Partner Creates Custom Field

1. Create organization and partner
2. Partner creates a custom profile field
3. Verify field exists in database
4. Delete organization
5. Verify custom profile field is deleted
6. Verify default fields still exist

### Test Case 2: User-Assigned Profile Fields

1. Create organization, partner, and user
2. Create session for user
3. Assign profile field values to user/session
4. Delete organization
5. Verify all user profile fields are deleted
6. Verify default fields still exist

### Expected Behavior After Fix

When an organization is deleted:
- ✅ Custom profile fields created by partners are deleted
- ✅ Profile fields assigned to users are deleted (via user CASCADE)
- ✅ Profile fields assigned to sessions are deleted (via session CASCADE)
- ✅ Default profile fields remain untouched
- ✅ No orphaned records remain
- ✅ Console logs show count of deleted profile fields

## Verification Queries

### Check Database Integrity

```sql
-- All profile_fields should have valid references
SELECT
    'Total profile fields' as metric,
    COUNT(*) as count
FROM profile_fields
UNION ALL
SELECT
    'Default fields' as metric,
    COUNT(*) as count
FROM profile_fields
WHERE is_default = true
UNION ALL
SELECT
    'Custom fields' as metric,
    COUNT(*) as count
FROM profile_fields
WHERE is_default = false
UNION ALL
SELECT
    'Created by partners (all valid)' as metric,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.created_by_partner_id IS NOT NULL
AND EXISTS (SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id)
UNION ALL
SELECT
    'Assigned to users (all valid)' as metric,
    COUNT(*) as count
FROM profile_fields pf
WHERE pf.user_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = pf.user_id);
```

### Check Foreign Key Constraints

```sql
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profile_fields'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;
```

Should show:
- `fk_profile_fields_created_by_partner` → CASCADE
- `fk_profile_fields_created_by_user` → CASCADE
- `profile_fields_user_id_fkey` → CASCADE
- `profile_fields_session_id_fkey` → CASCADE

## Files Changed/Created

1. **backend/src/controllers/adminController.js**
   - Added Step 5 to delete profile_fields created by partners
   - Lines 292-300

2. **backend/database/migrations/fix_profile_fields_constraints.sql** (NEW)
   - Adds foreign key constraints with CASCADE delete

3. **backend/database/scripts/cleanup_orphaned_profile_fields.js** (NEW)
   - JavaScript cleanup script for orphaned profile fields

4. **backend/database/scripts/cleanup_orphaned_profile_fields.sql** (NEW)
   - SQL cleanup script for orphaned profile fields

5. **PROFILE_FIELDS_FIX.md** (NEW)
   - This documentation file

## Deployment Checklist

- [ ] Backup database before making changes
- [ ] Run cleanup script to remove existing orphaned records
- [ ] Verify cleanup with verification queries
- [ ] Run migration to add foreign key constraints
- [ ] Verify constraints were added correctly
- [ ] Deploy updated backend code
- [ ] Test organization deletion with profile fields
- [ ] Verify no orphaned records remain
- [ ] Update team documentation

## Rollback Plan

If issues arise:

```sql
-- Remove the foreign key constraints
ALTER TABLE profile_fields
DROP CONSTRAINT IF EXISTS fk_profile_fields_created_by_partner;

ALTER TABLE profile_fields
DROP CONSTRAINT IF EXISTS fk_profile_fields_created_by_user;
```

Then rollback the code deployment.

## Future Improvements

Consider:
- Soft delete for profile_fields (mark as deleted instead of hard delete)
- Audit trail for profile field creation/deletion
- Admin UI to manage system-wide default fields
- Bulk import/export of profile field definitions

---

**Issue Reported**: 2025-01-28
**Fix Applied**: 2025-01-28
**Status**: ✅ Resolved
**Severity**: Medium (Data Integrity Issue)
