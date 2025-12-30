-- Add Free Plan for partners in TheraPTrack controlled organizations
-- This plan is automatically assigned to partners who don't have an explicit subscription assignment
-- Free Plan only supports monthly billing (no quarterly or yearly options)

-- First, ensure the period control columns exist
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS individual_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS individual_monthly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_yearly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_quarterly_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS organization_monthly_enabled BOOLEAN DEFAULT TRUE;

-- Check if Free Plan already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Free Plan') THEN
    -- Update existing Free Plan to disable quarterly/yearly billing
    UPDATE subscription_plans
    SET
      min_sessions = 0,
      max_sessions = 0,
      has_video = FALSE,
      individual_yearly_price = 0.00,
      individual_quarterly_price = 0.00,
      individual_monthly_price = 0.00,
      organization_yearly_price = 0.00,
      organization_quarterly_price = 0.00,
      organization_monthly_price = 0.00,
      is_active = TRUE,
      individual_yearly_enabled = FALSE,
      individual_quarterly_enabled = FALSE,
      individual_monthly_enabled = TRUE,
      organization_yearly_enabled = FALSE,
      organization_quarterly_enabled = FALSE,
      organization_monthly_enabled = TRUE
    WHERE plan_name = 'Free Plan';
  ELSE
    -- Insert new Free Plan with monthly-only billing
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
      'Free Plan',
      0,
      0,
      FALSE,
      0.00,  -- Free for all billing periods
      0.00,
      0.00,
      0.00,
      0.00,
      0.00,
      TRUE,
      FALSE,  -- Disable yearly for individual therapists
      FALSE,  -- Disable quarterly for individual therapists
      TRUE,   -- Enable monthly for individual therapists (always required)
      FALSE,  -- Disable yearly for organizations
      FALSE,  -- Disable quarterly for organizations
      TRUE    -- Enable monthly for organizations (always required)
    );
  END IF;
END $$;

-- Add comment to identify Free Plan
COMMENT ON TABLE subscription_plans IS 'Subscription plans including Free Plan for TheraPTrack controlled organizations (monthly billing only)';


















