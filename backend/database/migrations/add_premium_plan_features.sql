-- Migration: Add Premium Plan Features
-- Date: 2026-01-01
-- Purpose: Add new feature columns for Pro Plan Premium subscription

-- Phase 1: Add New Feature Columns
-- =====================================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS has_blogs_events_announcements BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_customized_feature_support BOOLEAN DEFAULT FALSE;

-- Add comments for new feature flags
COMMENT ON COLUMN subscription_plans.has_blogs_events_announcements IS 'Whether this plan includes Blogs, Events and Announcements feature for client view';
COMMENT ON COLUMN subscription_plans.has_customized_feature_support IS 'Whether this plan includes Customized Feature Support based on feasibility';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_subscription_plans_has_blogs_events ON subscription_plans(has_blogs_events_announcements);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_has_customized_feature ON subscription_plans(has_customized_feature_support);

-- Phase 2: Create/Update Pro Plan Premium
-- =====================================================

-- Check if Pro Plan Premium exists and update or insert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Pro Plan Premium') THEN
    -- Update existing Pro Plan Premium
    UPDATE subscription_plans SET
      plan_type = 'individual',
      min_sessions = 0,
      max_sessions = NULL,
      has_video = TRUE,
      has_whatsapp = TRUE,
      has_advanced_assessments = TRUE,
      has_report_generation = TRUE,
      has_custom_branding = TRUE,
      has_advanced_analytics = TRUE,
      has_blogs_events_announcements = TRUE,
      has_customized_feature_support = TRUE,
      has_priority_support = TRUE,
      has_email_support = FALSE,
      plan_duration_days = NULL,
      plan_order = 4,
      individual_yearly_price = 14999.00,
      individual_quarterly_price = 3999.00,
      individual_monthly_price = 1499.00,
      organization_yearly_price = 0.00,
      organization_quarterly_price = 0.00,
      organization_monthly_price = 0.00,
      is_active = TRUE,
      individual_yearly_enabled = TRUE,
      individual_quarterly_enabled = TRUE,
      individual_monthly_enabled = TRUE,
      organization_yearly_enabled = FALSE,
      organization_quarterly_enabled = FALSE,
      organization_monthly_enabled = FALSE
    WHERE plan_name = 'Pro Plan Premium';
  ELSE
    -- Insert new Pro Plan Premium
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video,
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_blogs_events_announcements, has_customized_feature_support,
      has_priority_support, has_email_support,
      plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Pro Plan Premium', 'individual', 0, NULL, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE, TRUE,
      TRUE, FALSE,
      NULL, 4,
      14999.00, 3999.00, 1499.00,
      0.00, 0.00, 0.00,
      TRUE,
      TRUE, TRUE, TRUE,
      FALSE, FALSE, FALSE
    );
  END IF;
END $$;

-- Phase 3: Update plan_order for existing plans to accommodate Pro Plan Premium
-- =====================================================

-- Shift plan orders to make room for Pro Plan Premium (order 4)
UPDATE subscription_plans
SET plan_order = plan_order + 1
WHERE plan_order >= 4 AND plan_name != 'Pro Plan Premium';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify migration success
SELECT
  plan_name,
  has_blogs_events_announcements,
  has_customized_feature_support,
  has_custom_branding,
  has_advanced_analytics,
  plan_order
FROM subscription_plans
WHERE is_active = TRUE
ORDER BY plan_order;

