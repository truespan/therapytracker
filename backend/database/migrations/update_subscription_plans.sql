-- Migration to update subscription plan options
-- This adds more granular plan options for organizations

-- Step 1: Update any existing empty string values to NULL
UPDATE organizations
SET subscription_plan = NULL
WHERE subscription_plan = '';

-- Step 2: Migrate old plan values to new format if needed
-- Note: 'basic' remains valid, but 'silver' and 'gold' need to be migrated
-- Uncomment and modify these if you have existing data with old values:
-- UPDATE organizations SET subscription_plan = 'basic_silver' WHERE subscription_plan = 'silver';
-- UPDATE organizations SET subscription_plan = 'basic_gold' WHERE subscription_plan = 'gold';

-- Step 3: Drop the existing CHECK constraint on subscription_plan
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

-- Step 4: Add the updated CHECK constraint with 7 plan options (NULL allowed for "No plan")
ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (subscription_plan IS NULL OR subscription_plan IN (
    'basic',
    'basic_silver',
    'basic_gold',
    'pro_silver',
    'pro_gold',
    'pro_platinum'
));

-- Step 5: Update comment
COMMENT ON COLUMN organizations.subscription_plan IS 'Subscription tier: basic, basic_silver, basic_gold, pro_silver, pro_gold, or pro_platinum. NULL means no plan.';

-- Step 6: Verify the migration
SELECT
    COUNT(*) as total_organizations,
    COUNT(subscription_plan) as organizations_with_plan,
    COUNT(*) - COUNT(subscription_plan) as organizations_without_plan
FROM organizations;

-- Migration completed successfully
SELECT 'Subscription plan options updated successfully. Organizations can now have 7 plan options.' as message;
