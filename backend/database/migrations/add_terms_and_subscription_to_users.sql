-- Migration: Add terms acceptance and subscription fields to partners and organizations
-- This migration adds tracking for Terms & Conditions acceptance and individual partner subscriptions

-- Step 1: Add terms acceptance fields to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_billing_period VARCHAR(20) CHECK (subscription_billing_period IS NULL OR subscription_billing_period IN ('yearly', 'quarterly', 'monthly')),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE;

-- Step 2: Add terms acceptance fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_terms_accepted ON partners(terms_accepted);
CREATE INDEX IF NOT EXISTS idx_partners_subscription_plan_id ON partners(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_partners_subscription_end_date ON partners(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_organizations_terms_accepted ON organizations(terms_accepted);

-- Step 4: Add comments to document the new columns
COMMENT ON COLUMN partners.terms_accepted IS 'Whether the partner has accepted Terms & Conditions';
COMMENT ON COLUMN partners.terms_accepted_at IS 'Timestamp when Terms & Conditions were accepted';
COMMENT ON COLUMN partners.subscription_plan_id IS 'Individual subscription plan for TheraPTrack-controlled partners';
COMMENT ON COLUMN partners.subscription_billing_period IS 'Billing period for individual subscription: yearly, quarterly, or monthly';
COMMENT ON COLUMN partners.subscription_start_date IS 'Start date of individual subscription';
COMMENT ON COLUMN partners.subscription_end_date IS 'End date of individual subscription';

COMMENT ON COLUMN organizations.terms_accepted IS 'Whether the organization has accepted Terms & Conditions';
COMMENT ON COLUMN organizations.terms_accepted_at IS 'Timestamp when Terms & Conditions were accepted';

-- Step 5: Set default values for existing records
-- Existing partners and organizations are considered to have accepted terms (grandfather clause)
UPDATE partners
SET terms_accepted = TRUE, terms_accepted_at = CURRENT_TIMESTAMP
WHERE terms_accepted IS NULL OR terms_accepted = FALSE;

UPDATE organizations
SET terms_accepted = TRUE, terms_accepted_at = CURRENT_TIMESTAMP
WHERE terms_accepted IS NULL OR terms_accepted = FALSE;

