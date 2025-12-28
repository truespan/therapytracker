-- Migration to add subscription cancellation fields
-- This allows users to cancel subscriptions while maintaining access until end date

-- Add cancellation fields to partner_subscriptions table
ALTER TABLE partner_subscriptions
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP DEFAULT NULL;

-- Add cancellation fields to organizations table for their subscriptions
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP DEFAULT NULL;

-- Add indexes for efficient queries on subscription end dates
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_end_date 
ON partner_subscriptions(subscription_end_date);

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_end_date 
ON organizations(subscription_end_date);

-- Add indexes for cancelled subscriptions
CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_cancelled 
ON partner_subscriptions(is_cancelled) WHERE is_cancelled = TRUE;

CREATE INDEX IF NOT EXISTS idx_organizations_cancelled 
ON organizations(is_cancelled) WHERE is_cancelled = TRUE;

-- Add comment to document the cancellation logic
COMMENT ON COLUMN partner_subscriptions.is_cancelled IS 
'Indicates if subscription is cancelled. User retains access until subscription_end_date';

COMMENT ON COLUMN partner_subscriptions.cancellation_date IS 
'Timestamp when subscription was cancelled by user';

COMMENT ON COLUMN organizations.is_cancelled IS 
'Indicates if organization subscription is cancelled. Access retained until subscription_end_date';

COMMENT ON COLUMN organizations.cancellation_date IS 
'Timestamp when organization subscription was cancelled';



