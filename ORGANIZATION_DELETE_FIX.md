# Organization Deletion Fix - Complete User Cleanup

## Issue Description

**Problem**: When deleting an organization, the auth credentials for partners were properly deleted, but the **users/clients themselves** (along with their auth credentials) linked to those partners were NOT being deleted. This caused orphaned user records to remain in the database.

**Impact**:
- Users who should no longer exist still had records in the database
- User auth credentials remained, allowing potential login attempts
- Orphaned sessions, profile fields, and other user data remained
- Database integrity was compromised with orphaned records
- Potential security issue with abandoned user accounts and their data

## Root Cause

The `deleteOrganization` function in `backend/src/controllers/adminController.js` was:
1. ✅ Deleting partner auth credentials
2. ✅ Deleting organization auth credentials
3. ❌ **NOT** deleting user/client auth credentials
4. ❌ **NOT** deleting user/client records themselves

This happened because:
- The deletion logic didn't account for users being linked to partners through the `user_partner_assignments` table
- Even though partners were deleted (CASCADE), users themselves don't cascade delete
- Users and their auth credentials remained orphaned in the database

## Database Relationships

```
organizations (1) ─────> (many) partners
                              │
                              └─> (many) user_partner_assignments ─> (1) users
                                                                           │
                                                                           └─> auth_credentials
```

When an organization is deleted:
- Partners are deleted (CASCADE from organizations)
- User-partner assignments are deleted (CASCADE from partners)
- **Users remain in database** (no CASCADE relationship)
- **Auth credentials for users remain** (no CASCADE relationship)
- **Sessions, profile fields remain** (orphaned data)

**THIS WAS THE BUG** - Users and all their data should be deleted when their organization/partners are deleted.

## The Fix

### Code Changes

**File**: `backend/src/controllers/adminController.js`
**Function**: `deleteOrganization` (lines 249-299)

**Before** (only deleted credentials, NOT user records):
```javascript
await db.transaction(async (client) => {
  // Get partner IDs
  const partnersResult = await client.query(
    'SELECT id FROM partners WHERE organization_id = $1',
    [id]
  );
  const partnerIds = partnersResult.rows.map(row => row.id);

  // Delete partner credentials
  if (partnerIds.length > 0) {
    await client.query(
      'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
      ['partner', partnerIds]
    );
  }

  // Delete organization credentials
  await client.query(
    'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2',
    ['organization', id]
  );

  // Delete organization
  await client.query('DELETE FROM organizations WHERE id = $1', [id]);
});
```

**After** (now deletes user records AND credentials completely):
```javascript
await db.transaction(async (client) => {
  // Step 1: Get all partner IDs for this organization
  const partnersResult = await client.query(
    'SELECT id FROM partners WHERE organization_id = $1',
    [id]
  );
  const partnerIds = partnersResult.rows.map(row => row.id);

  if (partnerIds.length > 0) {
    // Step 2: Get all user IDs linked to these partners
    const usersResult = await client.query(
      'SELECT DISTINCT user_id FROM user_partner_assignments WHERE partner_id = ANY($1)',
      [partnerIds]
    );
    const userIds = usersResult.rows.map(row => row.user_id);

    if (userIds.length > 0) {
      // Step 3: Delete auth credentials for all users/clients first
      await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
        ['user', userIds]
      );
      console.log(`[ADMIN] Deleted auth credentials for ${userIds.length} users`);

      // Step 4: Delete the users themselves (cascade deletes sessions, profile_fields, etc.)
      await client.query(
        'DELETE FROM users WHERE id = ANY($1)',
        [userIds]
      );
      console.log(`[ADMIN] Deleted ${userIds.length} user records`);
    }

    // Step 5: Delete auth credentials for all partners
    await client.query(
      'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
      ['partner', partnerIds]
    );
    console.log(`[ADMIN] Deleted auth credentials for ${partnerIds.length} partners`);
  }

  // Step 6: Delete auth credentials for organization
  await client.query(
    'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2',
    ['organization', id]
  );

  // Step 7: Delete organization (cascade handles partners and their data)
  await client.query('DELETE FROM organizations WHERE id = $1', [id]);
});
```

### What Changed?

The fix adds **Steps 2, 3, and 4**:

1. **Step 2**: Query `user_partner_assignments` to find all users linked to the partners being deleted
2. **Step 3**: Delete auth credentials for those users
3. **Step 4**: Delete the user records themselves (CASCADE deletes sessions, profile_fields, user_partner_assignments, questionnaire_responses, etc.)

This ensures **complete cleanup** of all related users and their data.

## Cleanup of Existing Orphaned Records

If you had organizations/users before this fix, you may have orphaned user records and auth credentials in your database.

### Option 1: JavaScript Cleanup Script (Recommended)

Run the automated cleanup script to delete **orphaned users completely**:

```bash
cd backend
npm install

# Using environment variable
DATABASE_URL="your_database_url" node database/scripts/cleanup_orphaned_users.js

# Or pass as argument
node database/scripts/cleanup_orphaned_users.js "postgresql://user:pass@host:5432/db"
```

This script will:
- ✅ Find all orphaned users (users with no partner assignments)
- ✅ Delete their auth credentials
- ✅ Delete the user records themselves
- ✅ CASCADE delete sessions, profile fields, questionnaire responses
- ✅ Show detailed report of what was deleted
- ✅ Verify database integrity

### Option 2: Manual SQL Cleanup

Run the SQL script manually:

```bash
psql -U your_username -d therapy_tracker -f backend/database/scripts/cleanup_orphaned_users.sql
```

Or execute the commands directly in psql:

```sql
-- Find orphaned users (users with no partner assignments)
SELECT u.id, u.name, u.email
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
);

-- Delete auth credentials for orphaned users
DELETE FROM auth_credentials
WHERE user_type = 'user'
AND reference_id IN (
  SELECT u.id FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
  )
);

-- Delete orphaned users (cascade deletes sessions, profile_fields, etc.)
DELETE FROM users
WHERE id NOT IN (
  SELECT DISTINCT user_id FROM user_partner_assignments
);

-- Verify cleanup
SELECT
  (SELECT COUNT(*) FROM users) as remaining_users,
  (SELECT COUNT(*) FROM auth_credentials WHERE user_type = 'user') as remaining_credentials;
```

## Testing the Fix

### Test Case 1: New Organization Deletion

1. **Create test organization**:
   - Login as admin
   - Create organization "Test Org"
   - Note the organization ID

2. **Create test partner under the organization**:
   - Login as organization
   - Create partner "Test Partner"
   - Note partner email

3. **Create test user linked to partner**:
   - Signup as user with partner ID
   - Note user email

4. **Verify before deletion**:
   ```sql
   -- Should show 1 organization, 1 partner, 1 user credentials
   SELECT user_type, COUNT(*) FROM auth_credentials GROUP BY user_type;
   ```

5. **Delete organization**:
   - Login as admin
   - Delete "Test Org"
   - Check backend logs for deletion messages

6. **Verify after deletion**:
   ```sql
   -- Should show 0 orphaned credentials
   SELECT COUNT(*) FROM auth_credentials
   WHERE user_type = 'user'
   AND reference_id NOT IN (SELECT id FROM users);

   SELECT COUNT(*) FROM auth_credentials
   WHERE user_type = 'partner'
   AND reference_id NOT IN (SELECT id FROM partners);

   SELECT COUNT(*) FROM auth_credentials
   WHERE user_type = 'organization'
   AND reference_id NOT IN (SELECT id FROM organizations);
   ```

7. **Verify login fails**:
   - Try to login with deleted user email → Should fail
   - Try to login with deleted partner email → Should fail
   - Try to login with deleted organization email → Should fail

### Test Case 2: Organization with Multiple Partners and Users

1. Create organization with 3 partners
2. Create 5 users (distributed across the 3 partners)
3. Delete organization
4. Verify all 15 credentials are deleted (3 partner + 5 user + 1 org)

### Expected Behavior After Fix

When an organization is deleted:
- ✅ Organization auth credentials deleted
- ✅ Organization record deleted (cascade deletes partners)
- ✅ All partner auth credentials deleted
- ✅ All user auth credentials deleted
- ✅ All user records deleted (cascade deletes sessions, profile_fields, etc.)
- ✅ No orphaned records remain
- ✅ Console logs show count of deleted users, credentials, and partners
- ✅ All related users/partners completely removed from database

## Verification Queries

### Check for Orphaned Users

```sql
-- Orphaned users (users with no partner assignments)
SELECT u.id, u.name, u.email, u.contact
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
);
```

Should return **0 rows** if the system is clean.

### Check for Orphaned Credentials

```sql
-- Orphaned user credentials
SELECT ac.email, ac.reference_id as user_id
FROM auth_credentials ac
WHERE ac.user_type = 'user'
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ac.reference_id);

-- Orphaned partner credentials
SELECT ac.email, ac.reference_id as partner_id
FROM auth_credentials ac
WHERE ac.user_type = 'partner'
AND NOT EXISTS (SELECT 1 FROM partners p WHERE p.id = ac.reference_id);

-- Orphaned organization credentials
SELECT ac.email, ac.reference_id as org_id
FROM auth_credentials ac
WHERE ac.user_type = 'organization'
AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = ac.reference_id);
```

All three queries should return **0 rows** if the system is clean.

### Database Integrity Check

```sql
-- Should return all valid credentials with matching records
SELECT
    ac.user_type,
    COUNT(ac.id) as credential_count,
    CASE ac.user_type
        WHEN 'user' THEN (SELECT COUNT(*) FROM users)
        WHEN 'partner' THEN (SELECT COUNT(*) FROM partners)
        WHEN 'organization' THEN (SELECT COUNT(*) FROM organizations)
        WHEN 'admin' THEN (SELECT COUNT(*) FROM admins)
    END as entity_count
FROM auth_credentials ac
GROUP BY ac.user_type
ORDER BY ac.user_type;
```

For each user_type, `credential_count` should equal `entity_count`.

## Prevention

This fix prevents the issue from occurring in the future. All new organization deletions will automatically:

1. Find all related users through partner relationships
2. Delete user auth credentials
3. **Delete user records themselves** (cascade deletes sessions, profile_fields, user_partner_assignments, questionnaire_responses, etc.)
4. Delete partner auth credentials
5. Delete organization auth credentials
6. Delete the organization (cascade deletes partners)

## Files Changed

1. **backend/src/controllers/adminController.js** (lines 259-308)
   - Updated `deleteOrganization` function
   - Now deletes users completely, not just their credentials

2. **backend/database/scripts/cleanup_orphaned_users.js** (NEW)
   - Automated JavaScript cleanup script for orphaned users
   - Deletes users and their auth credentials

3. **backend/database/scripts/cleanup_orphaned_users.sql** (NEW)
   - Manual SQL cleanup script for orphaned users

4. **backend/database/scripts/cleanup_orphaned_credentials.js** (NEW)
   - Automated JavaScript cleanup script for orphaned credentials only

5. **backend/database/scripts/cleanup_orphaned_user_credentials.sql** (NEW)
   - Manual SQL cleanup script for orphaned credentials only

6. **ORGANIZATION_DELETE_FIX.md** (NEW)
   - This documentation file

## Rollout Checklist

For existing deployments:

- [ ] Backup database before applying fix
- [ ] Deploy updated backend code
- [ ] Run cleanup script to remove existing orphaned records
- [ ] Verify with integrity check queries
- [ ] Test organization deletion with the test cases above
- [ ] Monitor backend logs for deletion messages
- [ ] Update team documentation

## Additional Notes

### Why Not Use CASCADE?

You might wonder why we don't just add `ON DELETE CASCADE` to the auth_credentials table. Here's why:

1. **Flexibility**: Auth credentials are a cross-cutting table that serves multiple entity types
2. **Control**: Explicit deletion gives us better control and logging
3. **Safety**: Cascades can accidentally delete too much; explicit is safer
4. **Audit Trail**: We can log exactly what's being deleted

### Future Improvements

Consider adding:
- Soft delete for organizations (mark as deleted instead of hard delete)
- Audit log table to track deletions
- Backup/archive of deleted entities
- Confirmation step before deleting organizations with many users
- Scheduled job to detect and alert on orphaned credentials

## Support

If you encounter issues:

1. Check backend logs for deletion messages
2. Run verification queries to check for orphans
3. Run cleanup script if needed
4. Review this documentation

---

**Issue Reported**: 2025-01-28
**Fix Applied**: 2025-01-28
**Status**: ✅ Resolved
**Severity**: Medium (Data Integrity Issue)
