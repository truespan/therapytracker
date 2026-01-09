-- Migration: Example locale pricing entries (for reference only)
-- This file shows example data structure. Use the admin panel to manage locale pricing.

-- IMPORTANT: This file is for documentation purposes only.
-- In production, use the admin panel (Locale Pricing Management) to set explicit prices
-- based on market research and business strategy, NOT automatic currency conversion.
--
-- Automatic currency conversion does not account for:
-- - Purchasing power differences between countries
-- - Local market conditions
-- - Competitive pricing in each market
-- - Tax implications
-- - Business strategy per region

-- Example data structure (commented out - uncomment and adjust as needed):
-- Replace the example prices below with actual market-researched prices

/*
-- Example: US pricing (adjust prices based on market research)
INSERT INTO subscription_plan_locales (
  subscription_plan_id, 
  country_code, 
  locale, 
  currency_code,
  individual_yearly_price, 
  individual_quarterly_price, 
  individual_monthly_price,
  organization_yearly_price, 
  organization_quarterly_price, 
  organization_monthly_price,
  is_active
) VALUES
  -- Example: Plan ID 1 for US market
  -- Adjust these prices based on market research and business strategy
  (1, 'US', 'en-US', 'USD', 120.00, 35.00, 12.00, 100.00, 30.00, 10.00, TRUE),
  -- Example: Plan ID 2 for US market
  (2, 'US', 'en-US', 'USD', 240.00, 70.00, 24.00, 200.00, 60.00, 20.00, TRUE);

-- Example: UK pricing (adjust prices based on market research)
INSERT INTO subscription_plan_locales (
  subscription_plan_id, 
  country_code, 
  locale, 
  currency_code,
  individual_yearly_price, 
  individual_quarterly_price, 
  individual_monthly_price,
  organization_yearly_price, 
  organization_quarterly_price, 
  organization_monthly_price,
  is_active
) VALUES
  -- Example: Plan ID 1 for UK market
  (1, 'GB', 'en-GB', 'GBP', 95.00, 28.00, 10.00, 80.00, 24.00, 8.00, TRUE),
  -- Example: Plan ID 2 for UK market
  (2, 'GB', 'en-GB', 'GBP', 190.00, 56.00, 20.00, 160.00, 48.00, 16.00, TRUE);

-- Example: Canada pricing (adjust prices based on market research)
INSERT INTO subscription_plan_locales (
  subscription_plan_id, 
  country_code, 
  locale, 
  currency_code,
  individual_yearly_price, 
  individual_quarterly_price, 
  individual_monthly_price,
  organization_yearly_price, 
  organization_quarterly_price, 
  organization_monthly_price,
  is_active
) VALUES
  -- Example: Plan ID 1 for Canada market
  (1, 'CA', 'en-CA', 'CAD', 150.00, 45.00, 16.00, 125.00, 38.00, 13.00, TRUE),
  -- Example: Plan ID 2 for Canada market
  (2, 'CA', 'en-CA', 'CAD', 300.00, 90.00, 32.00, 250.00, 75.00, 26.00, TRUE);

-- Use ON CONFLICT for updates if needed
ON CONFLICT (subscription_plan_id, country_code, locale) 
DO UPDATE SET
  currency_code = EXCLUDED.currency_code,
  individual_yearly_price = EXCLUDED.individual_yearly_price,
  individual_quarterly_price = EXCLUDED.individual_quarterly_price,
  individual_monthly_price = EXCLUDED.individual_monthly_price,
  organization_yearly_price = EXCLUDED.organization_yearly_price,
  organization_quarterly_price = EXCLUDED.organization_quarterly_price,
  organization_monthly_price = EXCLUDED.organization_monthly_price,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;
*/

-- NOTES:
-- 1. All prices should be set based on market research and business strategy
-- 2. Consider purchasing power parity, competitive pricing, and local market conditions
-- 3. Use the admin panel to manage locale pricing for easier maintenance
-- 4. Prices can be adjusted at any time through the admin interface
-- 5. The system will automatically use locale-specific pricing when available,
--    otherwise it falls back to global pricing from the subscription_plans table
