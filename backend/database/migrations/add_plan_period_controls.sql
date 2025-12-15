-- Migration: Add plan period enable/disable controls
-- This adds flags to enable/disable quarterly and yearly billing periods

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
