-- Migration: Replace existing subscription plans with new plans from pricing table
-- This deletes all existing plans and creates new plans as per the pricing table

-- Step 1: Ensure all required columns exist
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) CHECK (plan_type IN ('individual', 'organization')),
ADD COLUMN IF NOT EXISTS min_therapists INTEGER,
ADD COLUMN IF NOT EXISTS max_therapists INTEGER,
ADD COLUMN IF NOT EXISTS plan_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS individual_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_monthly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_monthly_enabled BOOLEAN DEFAULT TRUE;

-- Step 2: Delete all existing subscription plans
-- Note: This will cascade delete partner_subscriptions, so we need to handle that
DELETE FROM partner_subscriptions;
DELETE FROM subscription_plans;

-- Step 3: Reset the sequence
ALTER SEQUENCE subscription_plans_id_seq RESTART WITH 1;

-- Step 4: Insert new subscription plans for Individual Therapists

-- Starter Plan (Individual)
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    min_sessions,
    max_sessions,
    has_video,
    individual_yearly_price,
    individual_quarterly_price,
    individual_monthly_price,
    organization_yearly_price,
    organization_quarterly_price,
    organization_monthly_price,
    is_active,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled,
    plan_order
) VALUES (
    'Starter Plan',
    'individual',
    0,
    20,
    FALSE,
    3199.00,  -- Yearly: ₹3,199/year
    799.00,   -- Quarterly: ₹799/quarter (Note: corrected from typo ₹7,99)
    299.00,   -- Monthly: ₹299/month
    0.00,     -- Not available for organizations
    0.00,
    0.00,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    1
);

-- Pro Plan (Individual)
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    min_sessions,
    max_sessions,
    has_video,
    individual_yearly_price,
    individual_quarterly_price,
    individual_monthly_price,
    organization_yearly_price,
    organization_quarterly_price,
    organization_monthly_price,
    is_active,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled,
    plan_order
) VALUES (
    'Pro Plan',
    'individual',
    0,
    NULL,  -- Unlimited sessions
    FALSE,
    5599.00,  -- Yearly: ₹5,599/year
    1499.00,  -- Quarterly: ₹1,499/quarter
    549.00,   -- Monthly: ₹549/month
    0.00,     -- Not available for organizations
    0.00,
    0.00,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    2
);

-- Pro Plan Video (Individual)
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    min_sessions,
    max_sessions,
    has_video,
    individual_yearly_price,
    individual_quarterly_price,
    individual_monthly_price,
    organization_yearly_price,
    organization_quarterly_price,
    organization_monthly_price,
    is_active,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled,
    plan_order
) VALUES (
    'Pro Plan Video',
    'individual',
    0,
    NULL,  -- Unlimited sessions
    TRUE,
    9999.00,  -- Yearly: ₹9,999/year
    2699.00,  -- Quarterly: ₹2,699/quarter
    999.00,   -- Monthly: ₹999/month
    0.00,     -- Not available for organizations
    0.00,
    0.00,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    3
);

-- Step 5: Insert new subscription plans for Organizations (Small Org - 2-5 therapists)

-- Pro Plan (Organization - Small Org)
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    min_sessions,
    max_sessions,
    has_video,
    individual_yearly_price,
    individual_quarterly_price,
    individual_monthly_price,
    organization_yearly_price,
    organization_quarterly_price,
    organization_monthly_price,
    min_therapists,
    max_therapists,
    is_active,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled,
    plan_order
) VALUES (
    'Pro Plan',
    'organization',
    0,
    NULL,  -- Unlimited sessions
    FALSE,
    0.00,     -- Not available for individuals
    0.00,
    0.00,
    5599.00,  -- Yearly: ₹5,599/year per therapist
    1499.00,  -- Quarterly: ₹1,499/quarter per therapist
    549.00,   -- Monthly: ₹549/month per therapist
    2,        -- Min therapists: 2
    5,        -- Max therapists: 5
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    4
);

-- Pro Plan Video (Organization - Small Org)
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    min_sessions,
    max_sessions,
    has_video,
    individual_yearly_price,
    individual_quarterly_price,
    individual_monthly_price,
    organization_yearly_price,
    organization_quarterly_price,
    organization_monthly_price,
    min_therapists,
    max_therapists,
    is_active,
    individual_yearly_enabled,
    individual_quarterly_enabled,
    individual_monthly_enabled,
    organization_yearly_enabled,
    organization_quarterly_enabled,
    organization_monthly_enabled,
    plan_order
) VALUES (
    'Pro Plan Video',
    'organization',
    0,
    NULL,  -- Unlimited sessions
    TRUE,
    0.00,     -- Not available for individuals
    0.00,
    0.00,
    9999.00,  -- Yearly: ₹9,999/year per therapist
    2699.00,  -- Quarterly: ₹2,699/quarter per therapist
    999.00,   -- Monthly: ₹999/month per therapist
    2,        -- Min therapists: 2
    5,        -- Max therapists: 5
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    5
);

