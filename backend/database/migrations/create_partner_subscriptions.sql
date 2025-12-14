-- Create partner_subscriptions table for TheraPTrack controlled organizations
-- This table stores subscription plan assignments for individual therapists

CREATE TABLE IF NOT EXISTS partner_subscriptions (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, subscription_plan_id, billing_period)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_partner ON partner_subscriptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_plan ON partner_subscriptions(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_billing ON partner_subscriptions(billing_period);

-- Add comment
COMMENT ON TABLE partner_subscriptions IS 'Stores subscription plan assignments for therapists in TheraPTrack controlled organizations';






