-- =====================================================
-- Subscription Plans System Redesign Migration
-- Date: 2025-01-16
-- Purpose: Replace existing subscription plans with new 10-plan structure
-- =====================================================

-- Phase 1: Add New Schema Columns
-- =====================================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) CHECK (plan_type IN ('individual', 'organization')),
ADD COLUMN IF NOT EXISTS video_hours INTEGER,
ADD COLUMN IF NOT EXISTS extra_video_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS min_therapists INTEGER,
ADD COLUMN IF NOT EXISTS max_therapists INTEGER,
ADD COLUMN IF NOT EXISTS plan_order INTEGER DEFAULT 0;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type ON subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_therapist_range ON subscription_plans(min_therapists, max_therapists);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_order ON subscription_plans(plan_order);

-- Add constraint to ensure data integrity:
-- Individual plans must have NULL therapist ranges
-- Organization plans must have valid therapist ranges
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS check_therapist_range;

ALTER TABLE subscription_plans
ADD CONSTRAINT check_therapist_range CHECK (
  (plan_type = 'individual' AND min_therapists IS NULL AND max_therapists IS NULL) OR
  (plan_type = 'organization' AND min_therapists IS NOT NULL AND max_therapists IS NOT NULL AND min_therapists <= max_therapists)
);

-- Phase 2: Deactivate Old Plans
-- =====================================================

UPDATE subscription_plans SET is_active = FALSE
WHERE is_active = TRUE;

-- Phase 3: Insert 10 New Plans
-- =====================================================

-- Plan 1: Free Plan (Individual)
-- No billing period selection, no cost
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Free Plan', 'individual', 0, 999999, FALSE, NULL, NULL, NULL, NULL, 1,
 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, TRUE,
 FALSE, FALSE, TRUE, FALSE, FALSE, TRUE);

-- Plan 2: Starter Plan (Individual)
-- Up to 20 sessions, no video
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Starter Plan', 'individual', 0, 20, FALSE, NULL, NULL, NULL, NULL, 2,
 2999.00, 799.00, 299.00, 0.00, 0.00, 0.00, TRUE,
 TRUE, TRUE, TRUE, FALSE, FALSE, TRUE);

-- Plan 3: Pro Plan (Individual)
-- Unlimited sessions, no video
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Pro Plan', 'individual', 0, 999999, FALSE, NULL, NULL, NULL, NULL, 3,
 4999.00, 1349.00, 499.00, 0.00, 0.00, 0.00, TRUE,
 TRUE, TRUE, TRUE, FALSE, FALSE, TRUE);

-- Plan 4: Pro Plan Video Basic (Individual)
-- Unlimited sessions, 10 hours video, ₹0.75/extra min
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Pro Plan Video Basic (10hrs)', 'individual', 0, 999999, TRUE, 10, 0.75, NULL, NULL, 4,
 8999.00, 2399.00, 899.00, 0.00, 0.00, 0.00, TRUE,
 TRUE, TRUE, TRUE, FALSE, FALSE, TRUE);

-- Plan 5: Pro Plan Video Plus (Individual)
-- Unlimited sessions, 30 hours video, ₹0.75/extra min
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Pro Plan Video Plus (30hrs)', 'individual', 0, 999999, TRUE, 30, 0.75, NULL, NULL, 5,
 16999.00, 4499.00, 1674.00, 0.00, 0.00, 0.00, TRUE,
 TRUE, TRUE, TRUE, FALSE, FALSE, TRUE);

-- Plan 6: Pro Plan Video Premium (Individual)
-- Unlimited sessions, 50 hours video, ₹0.75/extra min
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Pro Plan Video Premium (50hrs)', 'individual', 0, 999999, TRUE, 50, 0.75, NULL, NULL, 6,
 24469.00, 6449.00, 2399.00, 0.00, 0.00, 0.00, TRUE,
 TRUE, TRUE, TRUE, FALSE, FALSE, TRUE);

-- Plan 7: Small Practice (2-5 therapists) 30hrs (Organization)
-- Per therapist pricing, 2-5 therapist range
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Small Practice (2-5) 30hrs', 'organization', 0, 999999, TRUE, 30, 0.75, 2, 5, 7,
 0.00, 0.00, 0.00, 18349.00, 4899.00, 1799.00, TRUE,
 FALSE, FALSE, TRUE, TRUE, TRUE, TRUE);

-- Plan 8: Small Practice (2-5 therapists) 50hrs (Organization)
-- Per therapist pricing, 2-5 therapist range
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Small Practice (2-5) 50hrs', 'organization', 0, 999999, TRUE, 50, 0.75, 2, 5, 8,
 0.00, 0.00, 0.00, 25499.00, 6749.00, 2499.00, TRUE,
 FALSE, FALSE, TRUE, TRUE, TRUE, TRUE);

-- Plan 9: Medium Practice (6-15 therapists) 30hrs (Organization)
-- Per therapist pricing, 6-15 therapist range
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Medium Practice (6-15) 30hrs', 'organization', 0, 999999, TRUE, 30, 0.75, 6, 15, 9,
 0.00, 0.00, 0.00, 17349.00, 4589.00, 1699.00, TRUE,
 FALSE, FALSE, TRUE, TRUE, TRUE, TRUE);

-- Plan 10: Medium Practice (6-15 therapists) 50hrs (Organization)
-- Per therapist pricing, 6-15 therapist range
INSERT INTO subscription_plans (
  plan_name, plan_type, min_sessions, max_sessions, has_video, video_hours, extra_video_rate,
  min_therapists, max_therapists, plan_order,
  individual_yearly_price, individual_quarterly_price, individual_monthly_price,
  organization_yearly_price, organization_quarterly_price, organization_monthly_price,
  is_active,
  individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
  organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
) VALUES
('Medium Practice (6-15) 50hrs', 'organization', 0, 999999, TRUE, 50, 0.75, 6, 15, 10,
 0.00, 0.00, 0.00, 23449.00, 6199.00, 2299.00, TRUE,
 FALSE, FALSE, TRUE, TRUE, TRUE, TRUE);

-- Phase 4: Reset Existing Subscriptions
-- =====================================================

-- Clear all partner subscriptions
-- Partners will be auto-assigned Free Plan when they next login or select a plan
DELETE FROM partner_subscriptions;

-- Clear organization subscriptions
-- Organizations will need to select plans for their partners
UPDATE organizations SET
  subscription_plan_id = NULL,
  subscription_billing_period = NULL,
  subscription_start_date = NULL,
  subscription_end_date = NULL
WHERE subscription_plan_id IS NOT NULL;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify migration success
SELECT
  COUNT(*) as total_plans,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_plans,
  COUNT(CASE WHEN plan_type = 'individual' THEN 1 END) as individual_plans,
  COUNT(CASE WHEN plan_type = 'organization' THEN 1 END) as organization_plans
FROM subscription_plans;

-- Expected result:
-- total_plans: > 10 (including old inactive plans)
-- active_plans: 10
-- individual_plans: 6
-- organization_plans: 4
