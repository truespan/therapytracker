-- Migration: Fix subscription_plan constraint to allow NULL values
-- This fixes the issue where empty subscription_plan values cause constraint violations

-- Drop the existing constraint
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

-- Add new constraint that allows NULL
ALTER TABLE organizations
ADD CONSTRAINT organizations_subscription_plan_check
CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'silver', 'gold'));

-- Update any existing empty string values to NULL
UPDATE organizations
SET subscription_plan = NULL
WHERE subscription_plan = '';

-- Verify the fix
SELECT
    id,
    name,
    subscription_plan
FROM organizations
ORDER BY id;
