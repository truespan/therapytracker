-- Migration: Add Razorpay payment integration tables
-- This creates tables to track Razorpay payments, subscriptions, and orders

-- Step 1: Create razorpay_payments table to track all payment transactions
CREATE TABLE IF NOT EXISTS razorpay_payments (
    id SERIAL PRIMARY KEY,
    razorpay_payment_id VARCHAR(255) UNIQUE NOT NULL,
    razorpay_order_id VARCHAR(255),
    razorpay_subscription_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed', 'pending')),
    payment_method VARCHAR(50),
    description TEXT,
    customer_id INTEGER, -- Can reference partner_id or organization_id
    customer_type VARCHAR(20) CHECK (customer_type IN ('partner', 'organization')),
    subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
    billing_period VARCHAR(20) CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create razorpay_subscriptions table to track recurring subscriptions
CREATE TABLE IF NOT EXISTS razorpay_subscriptions (
    id SERIAL PRIMARY KEY,
    razorpay_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    razorpay_plan_id VARCHAR(255),
    customer_id INTEGER NOT NULL,
    customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('partner', 'organization')),
    subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired')),
    current_start TIMESTAMP,
    current_end TIMESTAMP,
    ended_at TIMESTAMP,
    quantity INTEGER DEFAULT 1,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create razorpay_orders table to track orders
CREATE TABLE IF NOT EXISTS razorpay_orders (
    id SERIAL PRIMARY KEY,
    razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    receipt VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'captured')),
    customer_id INTEGER,
    customer_type VARCHAR(20) CHECK (customer_type IN ('partner', 'organization')),
    subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
    billing_period VARCHAR(20) CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    notes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create razorpay_webhooks table to track webhook events
CREATE TABLE IF NOT EXISTS razorpay_webhooks (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Add Razorpay subscription reference to partner_subscriptions table
ALTER TABLE partner_subscriptions
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE;

-- Step 6: Add Razorpay subscription reference to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_payment_id ON razorpay_payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_order_id ON razorpay_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_subscription_id ON razorpay_payments(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_customer ON razorpay_payments(customer_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_status ON razorpay_payments(status);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_created_at ON razorpay_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_razorpay_subscriptions_subscription_id ON razorpay_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_subscriptions_customer ON razorpay_subscriptions(customer_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_razorpay_subscriptions_status ON razorpay_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_razorpay_subscriptions_plan ON razorpay_subscriptions(subscription_plan_id);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_order_id ON razorpay_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_status ON razorpay_orders(status);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_customer ON razorpay_orders(customer_id, customer_type);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhooks_event_id ON razorpay_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_webhooks_event_type ON razorpay_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_razorpay_webhooks_processed ON razorpay_webhooks(processed);

CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_razorpay ON partner_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_razorpay_subscription ON organizations(razorpay_subscription_id);

-- Add comments
COMMENT ON TABLE razorpay_payments IS 'Tracks all Razorpay payment transactions';
COMMENT ON TABLE razorpay_subscriptions IS 'Tracks Razorpay recurring subscriptions';
COMMENT ON TABLE razorpay_orders IS 'Tracks Razorpay orders';
COMMENT ON TABLE razorpay_webhooks IS 'Tracks Razorpay webhook events for audit and debugging';

