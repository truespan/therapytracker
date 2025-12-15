# Subscription Plan Period Controls Implementation Plan

## Overview
Implement the ability to enable/disable quarterly and yearly subscription plans for both Individual Therapist Prices and Organization Prices in the admin panel, while ensuring monthly plans remain always enabled.

## Current State Analysis
- Subscription plans have 6 price fields: individual_yearly_price, individual_quarterly_price, individual_monthly_price, organization_yearly_price, organization_quarterly_price, organization_monthly_price
- All billing periods (monthly, quarterly, yearly) are always available for assignment
- No way to disable specific billing periods per plan

## Required Changes

### 1. Database Schema Changes
**File**: `backend/database/migrations/add_plan_period_controls.sql`

Add 6 boolean columns to `subscription_plans` table:
- `individual_yearly_enabled` (default: true)
- `individual_quarterly_enabled` (default: true)
- `individual_monthly_enabled` (default: true, forced by trigger)
- `organization_yearly_enabled` (default: true)
- `organization_quarterly_enabled` (default: true)
- `organization_monthly_enabled` (default: true, forced by trigger)

**Constraints**:
- Monthly plans must always remain enabled
- Create trigger to enforce monthly_enabled = true on INSERT/UPDATE

### 2. Backend Model Updates
**File**: `backend/src/models/SubscriptionPlan.js`

**Changes needed**:
- Update `create()` method to handle new enable/disable fields
- Update `update()` method to handle new enable/disable fields
- Add validation to ensure monthly fields are always true
- Update `getAll()` and `getActive()` to return new fields

**New parameters to handle**:
- individual_yearly_enabled
- individual_quarterly_enabled
- individual_monthly_enabled
- organization_yearly_enabled
- organization_quarterly_enabled
- organization_monthly_enabled

### 3. Backend Controller Updates
**File**: `backend/src/controllers/subscriptionPlanController.js`

**Changes needed**:
- Update `createPlan()` to validate and process new enable/disable fields
- Update `updatePlan()` to validate and process new enable/disable fields
- Add validation to ensure monthly fields cannot be set to false
- Ensure proper boolean conversion for new fields

**Validation rules**:
- All enable/disable fields must be boolean
- Monthly fields (individual_monthly_enabled, organization_monthly_enabled) must be true
- If not provided, default to true for all fields

### 4. Frontend Admin Panel Updates
**File**: `frontend/src/components/admin/SubscriptionPlansTab.jsx`

**Changes needed**:
- Add checkbox controls for each billing period under "Individual Therapist Prices" section
- Add checkbox controls for each billing period under "Organization Prices" section
- Monthly checkboxes should be disabled (always checked, cannot be unchecked)
- Update form state to include new enable/disable fields
- Update `handleChange()` to handle checkbox changes
- Update form submission to include new fields

**UI Layout**:
```
Individual Therapist Prices
[✓] Monthly (always enabled, disabled checkbox)
[✓] Quarterly (checkbox)
[✓] Yearly (checkbox)

Organization Prices (per Therapist)
[✓] Monthly (always enabled, disabled checkbox)
[✓] Quarterly (checkbox)
[✓] Yearly (checkbox)
```

### 5. Frontend Subscription Management Updates
**File**: `frontend/src/components/organization/SubscriptionManagement.jsx`

**Changes needed**:
- Filter billing period options based on plan settings
- When a plan is selected, check which billing periods are enabled
- Only show enabled billing periods in the dropdown
- Monthly should always be available
- Show disabled periods as greyed out or not shown at all

**Logic**:
```javascript
const getAvailableBillingPeriods = (planId) => {
  const plan = subscriptionPlans.find(p => p.id === parseInt(planId));
  if (!plan) return ['monthly']; // Default to monthly only
  
  const periods = ['monthly']; // Always include monthly
  
  if (plan.individual_quarterly_enabled) periods.push('quarterly');
  if (plan.individual_yearly_enabled) periods.push('yearly');
  
  return periods;
};
```

### 6. API Service Updates
**File**: `frontend/src/services/api.js`

**Changes needed**:
- No changes required to API service layer
- Existing `subscriptionPlanAPI` methods will automatically handle new fields
- The API endpoints remain the same

## Implementation Order

1. **Database Migration**: Create and run SQL migration
2. **Backend Model**: Update SubscriptionPlan.js
3. **Backend Controller**: Update subscriptionPlanController.js
4. **Frontend Admin**: Update SubscriptionPlansTab.jsx
5. **Frontend Management**: Update SubscriptionManagement.jsx
6. **Testing**: Verify all functionality works correctly

## Testing Checklist

- [ ] Monthly plans are always enabled and cannot be disabled
- [ ] Quarterly and yearly plans can be enabled/disabled independently
- [ ] Disabled billing periods don't appear in subscription assignment dropdown
- [ ] Enabled billing periods appear correctly in dropdown
- [ ] Existing subscription plans get default values (all enabled)
- [ ] Plan updates correctly save enable/disable settings
- [ ] Plan creation correctly handles enable/disable settings
- [ ] Subscription assignment respects plan settings
- [ ] Both individual and organization pricing periods work independently

## Database Migration SQL

```sql
-- Migration: Add plan period enable/disable controls

-- Add enable/disable flags for individual therapist pricing periods
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS individual_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_monthly_enabled BOOLEAN DEFAULT TRUE;

-- Add enable/disable flags for organization pricing periods
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS organization_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_monthly_enabled BOOLEAN DEFAULT TRUE;

-- Add comments to document the new columns
COMMENT ON COLUMN subscription_plans.individual_yearly_enabled IS 'Whether yearly billing is enabled for individual therapists';
COMMENT ON COLUMN subscription_plans.individual_quarterly_enabled IS 'Whether quarterly billing is enabled for individual therapists';
COMMENT ON COLUMN subscription_plans.individual_monthly_enabled IS 'Whether monthly billing is enabled for individual therapists (should always be true)';
COMMENT ON COLUMN subscription_plans.organization_yearly_enabled IS 'Whether yearly billing is enabled for organizations';
COMMENT ON COLUMN subscription_plans.organization_quarterly_enabled IS 'Whether quarterly billing is enabled for organizations';
COMMENT ON COLUMN subscription_plans.organization_monthly_enabled IS 'Whether monthly billing is enabled for organizations (should always be true)';

-- Ensure monthly plans are always enabled by creating a trigger
CREATE OR REPLACE FUNCTION ensure_monthly_plans_enabled()
RETURNS TRIGGER AS $$
BEGIN
    -- Force monthly plans to always be enabled
    NEW.individual_monthly_enabled := TRUE;
    NEW.organization_monthly_enabled := TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_monthly_plans_enabled_trigger
    BEFORE INSERT OR UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION ensure_monthly_plans_enabled();

-- Update existing records to ensure monthly plans are enabled
UPDATE subscription_plans
SET 
    individual_monthly_enabled = TRUE,
    organization_monthly_enabled = TRUE,
    individual_yearly_enabled = COALESCE(individual_yearly_enabled, TRUE),
    individual_quarterly_enabled = COALESCE(individual_quarterly_enabled, TRUE),
    organization_yearly_enabled = COALESCE(organization_yearly_enabled, TRUE),
    organization_quarterly_enabled = COALESCE(organization_quarterly_enabled, TRUE);
```

## Rollback Plan

If issues occur, the migration can be rolled back with:

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

1. Admin can enable/disable quarterly and yearly plans for both individual and organization pricing
2. Monthly plans remain always enabled and cannot be disabled
3. Subscription assignment UI only shows enabled billing periods
4. All existing functionality continues to work
5. New plans default to all billing periods enabled
6. Changes are properly validated on both frontend and backend