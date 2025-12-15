-- Add Free Plan for partners in TheraPTrack controlled organizations
-- This plan is automatically assigned to partners who don't have an explicit subscription assignment

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
  is_active
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
  TRUE
) ON CONFLICT DO NOTHING;

-- Add comment to identify Free Plan
COMMENT ON TABLE subscription_plans IS 'Subscription plans including Free Plan for TheraPTrack controlled organizations';







