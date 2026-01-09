-- Migration: Add locale/country support for subscription plans
-- This creates the subscription_plan_locales table to store locale-specific pricing

-- Step 1: Create a locale_mappings table to store country codes and locales
CREATE TABLE IF NOT EXISTS subscription_plan_locales (
    id SERIAL PRIMARY KEY,
    subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 (e.g., 'US', 'IN', 'GB')
    locale VARCHAR(10) NOT NULL, -- e.g., 'en-US', 'en-IN', 'hi-IN'
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR', -- ISO 4217 (e.g., 'USD', 'INR', 'GBP')
    
    -- Individual prices for this locale
    individual_yearly_price DECIMAL(10, 2) NOT NULL CHECK (individual_yearly_price >= 0),
    individual_quarterly_price DECIMAL(10, 2) NOT NULL CHECK (individual_quarterly_price >= 0),
    individual_monthly_price DECIMAL(10, 2) NOT NULL CHECK (individual_monthly_price >= 0),
    
    -- Organization prices for this locale
    organization_yearly_price DECIMAL(10, 2) NOT NULL CHECK (organization_yearly_price >= 0),
    organization_quarterly_price DECIMAL(10, 2) NOT NULL CHECK (organization_quarterly_price >= 0),
    organization_monthly_price DECIMAL(10, 2) NOT NULL CHECK (organization_monthly_price >= 0),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique plan + locale combination
    UNIQUE(subscription_plan_id, country_code, locale)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plan_locales_plan_id ON subscription_plan_locales(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_locales_country ON subscription_plan_locales(country_code);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_locales_locale ON subscription_plan_locales(locale);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_locales_active ON subscription_plan_locales(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_locales_country_locale ON subscription_plan_locales(country_code, locale);

-- Add comments
COMMENT ON TABLE subscription_plan_locales IS 'Locale-specific pricing for subscription plans';
COMMENT ON COLUMN subscription_plan_locales.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, IN, GB)';
COMMENT ON COLUMN subscription_plan_locales.locale IS 'Locale identifier (e.g., en-US, en-IN, hi-IN)';
COMMENT ON COLUMN subscription_plan_locales.currency_code IS 'ISO 4217 currency code (e.g., USD, INR, GBP)';

-- Step 2: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_plan_locales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plan_locales_updated_at
    BEFORE UPDATE ON subscription_plan_locales
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plan_locales_updated_at();
