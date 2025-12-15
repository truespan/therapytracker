-- Add Pro Plan and Pro Plus Plan for individual therapists
-- These plans will be available for therapists signing up through organization links

-- Add Pro Plan (Monthly only for individual therapists)
INSERT INTO subscription_plans (
  plan_name,
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
  organization_monthly_enabled
) VALUES (
  'Pro Plan',
  0,
  100,
  TRUE,  -- Has video feature
  0.00,  -- Not available for yearly
  0.00,  -- Not available for quarterly
  999.00,  -- Monthly price for individual therapists
  0.00,  -- Not available for organizations
  0.00,  -- Not available for organizations
  0.00,  -- Not available for organizations
  TRUE,  -- Active
  FALSE,  -- Disable yearly for individual
  FALSE,  -- Disable quarterly for individual
  TRUE,   -- Enable monthly for individual
  FALSE,  -- Disable yearly for organizations
  FALSE,  -- Disable quarterly for organizations
  FALSE   -- Disable monthly for organizations
) ON CONFLICT (plan_name) DO UPDATE SET
  min_sessions = 0,
  max_sessions = 100,
  has_video = TRUE,
  individual_monthly_price = 999.00,
  individual_monthly_enabled = TRUE,
  individual_yearly_enabled = FALSE,
  individual_quarterly_enabled = FALSE,
  organization_yearly_enabled = FALSE,
  organization_quarterly_enabled = FALSE,
  organization_monthly_enabled = FALSE;

-- Add Pro Plus Plan (Monthly only for individual therapists)
INSERT INTO subscription_plans (
  plan_name,
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
  organization_monthly_enabled
) VALUES (
  'Pro Plus Plan',
  101,
  200,
  TRUE,  -- Has video feature
  0.00,  -- Not available for yearly
  0.00,  -- Not available for quarterly
  1499.00,  -- Monthly price for individual therapists
  0.00,  -- Not available for organizations
  0.00,  -- Not available for organizations
  0.00,  -- Not available for organizations
  TRUE,  -- Active
  FALSE,  -- Disable yearly for individual
  FALSE,  -- Disable quarterly for individual
  TRUE,   -- Enable monthly for individual
  FALSE,  -- Disable yearly for organizations
  FALSE,  -- Disable quarterly for organizations
  FALSE   -- Disable monthly for organizations
) ON CONFLICT (plan_name) DO UPDATE SET
  min_sessions = 101,
  max_sessions = 200,
  has_video = TRUE,
  individual_monthly_price = 1499.00,
  individual_monthly_enabled = TRUE,
  individual_yearly_enabled = FALSE,
  individual_quarterly_enabled = FALSE,
  organization_yearly_enabled = FALSE,
  organization_quarterly_enabled = FALSE,
  organization_monthly_enabled = FALSE;

-- Update existing Free Plan to ensure it's properly configured
UPDATE subscription_plans
SET
  min_sessions = 0,
  max_sessions = 0,
  has_video = FALSE,
  individual_monthly_price = 0.00,
  individual_monthly_enabled = TRUE,
  individual_yearly_enabled = FALSE,
  individual_quarterly_enabled = FALSE,
  organization_yearly_enabled = FALSE,
  organization_quarterly_enabled = FALSE,
  organization_monthly_enabled = FALSE,
  is_active = TRUE
WHERE plan_name = 'Free Plan';

-- Add comments to identify the plans
COMMENT ON COLUMN subscription_plans.individual_monthly_enabled IS 'Whether individual therapists can purchase this plan with monthly billing';
COMMENT ON COLUMN subscription_plans.organization_monthly_enabled IS 'Whether organizations can purchase this plan with monthly billing';