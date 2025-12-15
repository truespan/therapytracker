# Subscription Plan Period Controls - Testing & Verification Guide

## Implementation Summary

This document provides a comprehensive testing guide for the newly implemented subscription plan period controls feature.

## What Was Implemented

### 1. Database Layer
- ✅ Added 6 new boolean columns to `subscription_plans` table
- ✅ Created trigger to enforce monthly plans always enabled
- ✅ Added proper SQL comments for documentation

### 2. Backend Layer
- ✅ Updated SubscriptionPlan model to handle new enable/disable fields
- ✅ Updated subscriptionPlanController with validation
- ✅ Enforced monthly plans cannot be disabled (backend validation)

### 3. Frontend Admin Panel
- ✅ Added checkbox controls for enabling/disabling each billing period
- ✅ Monthly checkboxes are disabled (always enabled)
- ✅ Separate controls for Individual and Organization pricing

### 4. Frontend Subscription Management
- ✅ Filtered billing period dropdown based on plan settings
- ✅ Only shows enabled billing periods when assigning subscriptions

## Testing Checklist

### Database Migration Testing

#### Step 1: Run the Migration
```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Run the migration
\i backend/database/migrations/add_plan_period_controls.sql
```

#### Step 2: Verify Columns Added
```sql
-- Check if new columns exist
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name LIKE '%_enabled'
ORDER BY column_name;
```

**Expected Result**: 6 rows showing all enable/disable columns with BOOLEAN type and DEFAULT true

#### Step 3: Verify Trigger Created
```sql
-- Check if trigger exists
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'ensure_monthly_plans_enabled_trigger';
```

**Expected Result**: 1 row showing the trigger exists and is set to BEFORE INSERT OR UPDATE

#### Step 4: Test Trigger Enforcement
```sql
-- Try to create a plan with monthly disabled (should be forced to true)
INSERT INTO subscription_plans (
    plan_name, min_sessions, max_sessions, has_video,
    individual_yearly_price, individual_quarterly_price, individual_monthly_price,
    organization_yearly_price, organization_quarterly_price, organization_monthly_price,
    is_active,
    individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
    organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES (
    'Test Plan', 0, 50, false,
    1000, 300, 100,
    800, 250, 80,
    true,
    true, true, false,  -- Trying to disable monthly
    true, true, false   -- Trying to disable monthly
) RETURNING 
    plan_name,
    individual_monthly_enabled,
    organization_monthly_enabled;
```

**Expected Result**: The query should succeed but `individual_monthly_enabled` and `organization_monthly_enabled` should both be TRUE (forced by trigger)

### Backend API Testing

#### Step 5: Test Creating Plan with Period Controls
```bash
curl -X POST http://localhost:5000/api/subscription-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "plan_name": "Test Plan with Controls",
    "min_sessions": 0,
    "max_sessions": 100,
    "has_video": true,
    "individual_yearly_price": 1200,
    "individual_quarterly_price": 350,
    "individual_monthly_price": 120,
    "organization_yearly_price": 1000,
    "organization_quarterly_price": 300,
    "organization_monthly_price": 100,
    "is_active": true,
    "individual_yearly_enabled": true,
    "individual_quarterly_enabled": false,
    "individual_monthly_enabled": true,
    "organization_yearly_enabled": true,
    "organization_quarterly_enabled": true,
    "organization_monthly_enabled": true
  }'
```

**Expected Result**: Plan created successfully with quarterly disabled for individuals

#### Step 6: Test Monthly Disable Validation
```bash
curl -X POST http://localhost:5000/api/subscription-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "plan_name": "Invalid Plan - Monthly Disabled",
    "min_sessions": 0,
    "max_sessions": 100,
    "has_video": false,
    "individual_yearly_price": 1000,
    "individual_quarterly_price": 300,
    "individual_monthly_price": 100,
    "organization_yearly_price": 800,
    "organization_quarterly_price": 250,
    "organization_monthly_price": 80,
    "is_active": true,
    "individual_monthly_enabled": false
  }'
```

**Expected Result**: 400 error - "Monthly billing periods cannot be disabled"

#### Step 7: Test Updating Plan Period Controls
```bash
curl -X PUT http://localhost:5000/api/subscription-plans/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "individual_quarterly_enabled": false,
    "organization_yearly_enabled": false
  }'
```

**Expected Result**: Plan updated successfully with specified periods disabled

### Frontend Admin Panel Testing

#### Step 8: Test Admin Panel UI
1. **Login as admin** and navigate to Admin Panel > Subscription Plans
2. **Create new plan**:
   - Fill in all required fields
   - Uncheck "Enable Quarterly Billing" for Individual Therapist Prices
   - Uncheck "Enable Yearly Billing" for Organization Prices
   - Try to uncheck Monthly (should be disabled)
   - Submit form
3. **Verify plan creation**: Check that plan was created with correct enable/disable settings
4. **Edit existing plan**:
   - Open edit modal for a plan
   - Toggle some enable/disable checkboxes
   - Verify monthly checkboxes remain disabled
   - Save changes
5. **Verify changes persisted**: Refresh page and check that settings were saved

#### Step 9: Test Subscription Management UI
1. **Login as organization admin** (TheraPTrack controlled organization)
2. **Navigate to Subscription Management**
3. **Select a plan** with quarterly disabled for individuals
4. **Verify billing period dropdown** only shows:
   - Monthly (always)
   - Yearly (if enabled)
   - Quarterly (should NOT appear if disabled)
5. **Test with different plans** to ensure filtering works correctly

### Integration Testing

#### Step 10: Test End-to-End Workflow
1. **Create a plan** with only monthly enabled for individuals
2. **Assign subscription** to a therapist using that plan
3. **Verify only monthly** appears in billing period dropdown
4. **Complete assignment** and verify it works
5. **Edit the plan** to enable quarterly
6. **Try assigning again** and verify quarterly now appears

#### Step 11: Test Edge Cases
1. **All periods disabled except monthly**: Should work fine, only monthly shows
2. **All periods enabled**: Should show all three options
3. **Mixed settings**: Individual has quarterly disabled, Organization has yearly disabled
4. **Plan with no settings** (existing plans): Should default to all enabled

### Verification Queries

#### Step 12: Verify Data Integrity
```sql
-- Check that existing plans got default values
SELECT 
    id,
    plan_name,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled
FROM subscription_plans
WHERE created_at < NOW() - INTERVAL '1 day'
ORDER BY id;

-- Should show all TRUE values for existing plans
```

#### Step 13: Verify Trigger Enforcement
```sql
-- Test that trigger forces monthly to true
UPDATE subscription_plans
SET 
    individual_monthly_enabled = false,
    organization_monthly_enabled = false
WHERE id = 1
RETURNING 
    plan_name,
    individual_monthly_enabled,
    organization_monthly_enabled;

-- Should show both monthly fields as TRUE despite setting to false
```

## Expected Behavior Summary

### ✅ What Should Work
- [ ] Admin can enable/disable quarterly and yearly plans independently
- [ ] Monthly plans always remain enabled (cannot be disabled)
- [ ] Subscription assignment UI filters billing periods based on plan settings
- [ ] Both Individual Therapist and Organization pricing can be controlled separately
- [ ] Existing plans default to all periods enabled
- [ ] Backend validation prevents disabling monthly plans
- [ ] Database trigger enforces monthly plans always enabled

### ❌ What Should Not Work
- [ ] Disabling monthly plans (should be prevented)
- [ ] Assigning subscriptions with disabled billing periods
- [ ] Creating plans without monthly enabled

## Troubleshooting Guide

### Issue: Migration fails to run
**Solution**: Check PostgreSQL version compatibility and ensure you have ALTER TABLE privileges

### Issue: Monthly plans can be disabled
**Solution**: Verify trigger was created correctly and is enabled

### Issue: Frontend doesn't show new checkboxes
**Solution**: Clear browser cache and ensure React app was rebuilt

### Issue: Billing periods not filtering correctly
**Solution**: Check that plan data includes new enable/disable fields in API response

### Issue: Validation errors when creating plans
**Solution**: Ensure all required fields are included and monthly fields are set to true

## Rollback Procedure

If critical issues are found, rollback the migration:

```sql
-- Remove the trigger first
DROP TRIGGER IF EXISTS ensure_monthly_plans_enabled_trigger ON subscription_plans;
DROP FUNCTION IF EXISTS ensure_monthly_plans_enabled();

-- Remove the new columns
ALTER TABLE subscription_plans
DROP COLUMN IF EXISTS individual_yearly_enabled,
DROP COLUMN IF EXISTS individual_quarterly_enabled,
DROP COLUMN IF EXISTS individual_monthly_enabled,
DROP COLUMN IF EXISTS organization_yearly_enabled,
DROP COLUMN IF EXISTS organization_quarterly_enabled,
DROP COLUMN IF EXISTS organization_monthly_enabled;
```

## Success Criteria

All tests should pass with the following results:
- ✅ Database migration runs successfully
- ✅ New columns are added with correct defaults
- ✅ Trigger enforces monthly plans always enabled
- ✅ Backend API handles new fields correctly
- ✅ Frontend admin panel shows new controls
- ✅ Monthly checkboxes are disabled in UI
- ✅ Subscription management filters billing periods correctly
- ✅ End-to-end workflow works as expected
- ✅ Edge cases are handled properly

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Run integration tests with real data
3. Monitor logs for any errors
4. Train admin users on new functionality
5. Update user documentation