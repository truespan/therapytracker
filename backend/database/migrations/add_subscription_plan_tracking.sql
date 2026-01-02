-- Migration: Add subscription plan event tracking
-- Purpose: Track when users see subscription plan modal and attempt payments
-- Date: 2026-01-02

-- Create subscription_plan_events table
CREATE TABLE IF NOT EXISTS subscription_plan_events (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('partner', 'organization')),
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('modal_shown', 'payment_attempted', 'payment_completed')),
    subscription_plan_id INTEGER REFERENCES subscription_plans(id),
    billing_period VARCHAR(20),
    is_first_login BOOLEAN DEFAULT FALSE,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plan_events_user ON subscription_plan_events(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_events_timestamp ON subscription_plan_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_events_type ON subscription_plan_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_events_first_login ON subscription_plan_events(is_first_login) WHERE is_first_login = TRUE;

-- Add comments to document the table and columns
COMMENT ON TABLE subscription_plan_events IS 'Tracks subscription plan selection events: when modal is shown, payment attempts, and completions';
COMMENT ON COLUMN subscription_plan_events.user_type IS 'Type of user: partner or organization';
COMMENT ON COLUMN subscription_plan_events.user_id IS 'ID of the user (partner or organization)';
COMMENT ON COLUMN subscription_plan_events.event_type IS 'Type of event: modal_shown, payment_attempted, or payment_completed';
COMMENT ON COLUMN subscription_plan_events.subscription_plan_id IS 'ID of the subscription plan selected (if applicable)';
COMMENT ON COLUMN subscription_plan_events.billing_period IS 'Billing period selected: monthly, quarterly, or yearly';
COMMENT ON COLUMN subscription_plan_events.is_first_login IS 'Whether this event occurred during the user''s first login';
COMMENT ON COLUMN subscription_plan_events.event_timestamp IS 'Timestamp when the event occurred';
COMMENT ON COLUMN subscription_plan_events.metadata IS 'Additional event data in JSON format (plan name, price, etc.)';

