# Subscription Plans Update

This document outlines the changes made to support 7 subscription plan options for organizations.

## Overview

Organizations can now be assigned one of the following subscription plans:

1. **No plan** - Organization has no subscription plan assigned
2. **Plan Basic** - Basic tier
3. **Plan Basic - Silver** - Basic tier with silver features
4. **Plan Basic - Gold** - Basic tier with gold features
5. **Plan Pro - Silver** - Professional tier with silver features
6. **Plan Pro - Gold** - Professional tier with gold features
7. **Plan Pro - Platinum** - Professional tier with platinum features (highest tier)

## Database Schema Values

The following values are stored in the database for `subscription_plan`:

- `NULL` or empty string - No plan
- `basic` - Plan Basic
- `basic_silver` - Plan Basic - Silver
- `basic_gold` - Plan Basic - Gold
- `pro_silver` - Plan Pro - Silver
- `pro_gold` - Plan Pro - Gold
- `pro_platinum` - Plan Pro - Platinum

## Changes Made

### 1. Database Migration

**File**: `backend/database/migrations/update_subscription_plans.sql`

- Drops the old CHECK constraint on `subscription_plan` column
- Adds new CHECK constraint supporting all 6 plan values (plus NULL for no plan)
- Updates column comment with new plan options

**To apply the migration**:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d therapy_tracker

# Run the migration
\i backend/database/migrations/update_subscription_plans.sql
```

Or using the command line:

```bash
psql -U your_username -d therapy_tracker -f backend/database/migrations/update_subscription_plans.sql
```

### 2. Backend Updates

**File**: `backend/src/controllers/adminController.js`

Updated validation in both `createOrganization` and `updateOrganization` functions:

- Line 56-61: Create organization validation
- Line 127-132: Update organization validation

Both now validate against the new plan options: `basic`, `basic_silver`, `basic_gold`, `pro_silver`, `pro_gold`, `pro_platinum`

### 3. Frontend Updates

#### CreateOrganizationModal
**File**: `frontend/src/components/admin/CreateOrganizationModal.jsx`

- Line 231-237: Updated subscription plan dropdown with all 7 options

#### EditOrganizationModal
**File**: `frontend/src/components/admin/EditOrganizationModal.jsx`

- Line 228-234: Updated subscription plan dropdown with all 7 options

#### AdminDashboard
**File**: `frontend/src/components/dashboard/AdminDashboard.jsx`

- Line 38-48: Added `getPlanDisplayName()` helper function to format plan names
- Line 366-367: Updated plan display to use the helper function

## Testing Checklist

### Database Migration
- [ ] Run the migration script successfully
- [ ] Verify the CHECK constraint is updated:
  ```sql
  SELECT constraint_name, check_clause
  FROM information_schema.check_constraints
  WHERE constraint_name LIKE '%subscription_plan%';
  ```
- [ ] Test that old plan values still work (if any existing organizations have `silver` or `gold` plans)

### Backend Testing
- [ ] Test creating organization with each plan option
- [ ] Test creating organization with no plan (empty value)
- [ ] Test updating organization plan to each option
- [ ] Test that invalid plan values are rejected
- [ ] Verify error messages are clear and helpful

### Frontend Testing
- [ ] Open Admin Dashboard
- [ ] Click "Create Organization"
- [ ] Verify dropdown shows all 7 plan options
- [ ] Create organization with each plan type
- [ ] Verify plan displays correctly in the organizations table
- [ ] Click "Edit" on an organization
- [ ] Verify dropdown shows all 7 plan options
- [ ] Update organization plan to different options
- [ ] Verify changes persist and display correctly

### Display Testing
- [ ] Verify plan names display with proper formatting:
  - "Plan Basic" not "basic"
  - "Plan Basic - Silver" not "basic_silver"
  - "Plan Pro - Platinum" not "pro_platinum"
- [ ] Verify "No plan" displays when subscription_plan is NULL or empty

## Migration Notes

### Existing Data
If you have existing organizations with the old plan values (`basic`, `silver`, `gold`), you may need to migrate them:

```sql
-- Check existing organizations with old plan values
SELECT id, name, subscription_plan
FROM organizations
WHERE subscription_plan IN ('silver', 'gold');

-- If needed, migrate old values to new format:
-- This is optional - depends on your business requirements

-- Example: Migrate 'silver' to 'basic_silver'
-- UPDATE organizations SET subscription_plan = 'basic_silver' WHERE subscription_plan = 'silver';

-- Example: Migrate 'gold' to 'basic_gold'
-- UPDATE organizations SET subscription_plan = 'basic_gold' WHERE subscription_plan = 'gold';
```

**Important**: The old `basic`, `silver`, and `gold` values are:
- `basic` is still valid (Plan Basic)
- `silver` and `gold` are **NOT valid** anymore and need to be migrated

### Rollback
If you need to rollback this change:

```sql
-- Drop the new constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

-- Add back the old constraint
ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (subscription_plan IN ('basic', 'silver', 'gold'));

-- Revert any data migrations if performed
```

## API Examples

### Creating an Organization with a Plan

```bash
curl -X POST http://localhost:3001/api/admin/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Example Therapy Center",
    "email": "info@example.com",
    "contact": "1234567890",
    "address": "123 Main St",
    "subscription_plan": "pro_gold",
    "video_sessions_enabled": true,
    "password": "SecurePassword123"
  }'
```

### Updating an Organization's Plan

```bash
curl -X PUT http://localhost:3001/api/admin/organizations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "subscription_plan": "pro_platinum"
  }'
```

### Setting No Plan

```bash
curl -X PUT http://localhost:3001/api/admin/organizations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "subscription_plan": ""
  }'
```

## Support

If you encounter any issues with the migration or have questions, please refer to the main documentation or contact the development team.
