-- Seed script: Initialize Plan 1 and Plan 2 with pricing data from CSV files
-- This script should be run after the subscription_plans table is created

-- Plan 1: 100 sessions per month per Therapist cap (NO VIDEO Feature)
-- Individual Therapists:
--   - Yearly: ₹7788 per year (₹649 per month)
--   - Quarterly: ₹2097 per quarter (₹699 per month)
--   - Monthly: ₹749 per month
-- Organization (per Therapist):
--   - Yearly: ₹7188 per year (₹599 per month)
--   - Quarterly: ₹1947 per quarter (₹649 per month)
--   - Monthly: ₹699 per month

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
  'Plan 1',
  0,
  100,
  FALSE,
  7788.00,  -- Individual yearly
  2097.00,  -- Individual quarterly
  749.00,   -- Individual monthly
  7188.00,  -- Organization yearly
  1947.00,  -- Organization quarterly
  699.00,   -- Organization monthly
  TRUE
) ON CONFLICT DO NOTHING;

-- Plan 2: 101 - 150 sessions per month per Therapist cap (NO VIDEO Feature)
-- Individual Therapists:
--   - Yearly: ₹8988 per year (₹749 per month)
--   - Quarterly: ₹2397 per quarter (₹799 per month)
--   - Monthly: ₹849 per month
-- Organization (per Therapist):
--   - Yearly: ₹8388 per year (₹699 per month)
--   - Quarterly: ₹2247 per quarter (₹749 per month)
--   - Monthly: ₹799 per month

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
  'Plan 2',
  101,
  150,
  FALSE,
  8988.00,  -- Individual yearly
  2397.00,  -- Individual quarterly
  849.00,   -- Individual monthly
  8388.00,  -- Organization yearly
  2247.00,  -- Organization quarterly
  799.00,   -- Organization monthly
  TRUE
) ON CONFLICT DO NOTHING;

-- Update existing organizations to have theraptrack_controlled = FALSE if not set
UPDATE organizations
SET theraptrack_controlled = FALSE
WHERE theraptrack_controlled IS NULL;


















