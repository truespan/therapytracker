-- Migration: Add subscription plan management system
-- This creates the subscription_plans table and updates organizations table with new subscription fields

-- Step 1: Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    min_sessions INTEGER NOT NULL CHECK (min_sessions >= 0),
    max_sessions INTEGER NOT NULL CHECK (max_sessions >= min_sessions),
    has_video BOOLEAN DEFAULT FALSE,
    individual_yearly_price DECIMAL(10, 2) NOT NULL CHECK (individual_yearly_price >= 0),
    individual_quarterly_price DECIMAL(10, 2) NOT NULL CHECK (individual_quarterly_price >= 0),
    individual_monthly_price DECIMAL(10, 2) NOT NULL CHECK (individual_monthly_price >= 0),
    organization_yearly_price DECIMAL(10, 2) NOT NULL CHECK (organization_yearly_price >= 0),
    organization_quarterly_price DECIMAL(10, 2) NOT NULL CHECK (organization_quarterly_price >= 0),
    organization_monthly_price DECIMAL(10, 2) NOT NULL CHECK (organization_monthly_price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_has_video ON subscription_plans(has_video);

-- Add comments to document the table and columns
COMMENT ON TABLE subscription_plans IS 'Subscription plans with configurable pricing and session limits';
COMMENT ON COLUMN subscription_plans.plan_name IS 'Name of the subscription plan (e.g., Plan 1, Plan 2)';
COMMENT ON COLUMN subscription_plans.min_sessions IS 'Minimum number of sessions per month allowed';
COMMENT ON COLUMN subscription_plans.max_sessions IS 'Maximum number of sessions per month allowed';
COMMENT ON COLUMN subscription_plans.has_video IS 'Whether this plan includes video feature';
COMMENT ON COLUMN subscription_plans.individual_yearly_price IS 'Yearly price for individual therapists';
COMMENT ON COLUMN subscription_plans.individual_quarterly_price IS 'Quarterly price for individual therapists';
COMMENT ON COLUMN subscription_plans.individual_monthly_price IS 'Monthly price for individual therapists';
COMMENT ON COLUMN subscription_plans.organization_yearly_price IS 'Yearly price per therapist for organizations';
COMMENT ON COLUMN subscription_plans.organization_quarterly_price IS 'Quarterly price per therapist for organizations';
COMMENT ON COLUMN subscription_plans.organization_monthly_price IS 'Monthly price per therapist for organizations';
COMMENT ON COLUMN subscription_plans.is_active IS 'Whether this plan is currently active and available';

-- Step 2: Update organizations table with new subscription fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS theraptrack_controlled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS number_of_therapists INTEGER CHECK (number_of_therapists IS NULL OR number_of_therapists > 0),
ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_billing_period VARCHAR(20) CHECK (subscription_billing_period IS NULL OR subscription_billing_period IN ('yearly', 'quarterly', 'monthly')),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_theraptrack_controlled ON organizations(theraptrack_controlled);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan_id ON organizations(subscription_plan_id);

-- Add comments to document the new columns
COMMENT ON COLUMN organizations.theraptrack_controlled IS 'Whether this organization is TheraPTrack controlled (therapists can see subscription details)';
COMMENT ON COLUMN organizations.number_of_therapists IS 'Number of therapists for billing calculation';
COMMENT ON COLUMN organizations.subscription_plan_id IS 'Current active subscription plan';
COMMENT ON COLUMN organizations.subscription_billing_period IS 'Billing period: yearly, quarterly, or monthly';
COMMENT ON COLUMN organizations.subscription_start_date IS 'Start date of the current subscription';
COMMENT ON COLUMN organizations.subscription_end_date IS 'End date of the current subscription';

-- Step 3: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Step 4: Set default theraptrack_controlled = FALSE for existing organizations
UPDATE organizations
SET theraptrack_controlled = FALSE
WHERE theraptrack_controlled IS NULL;






















