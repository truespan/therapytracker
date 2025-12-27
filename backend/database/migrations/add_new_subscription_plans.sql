-- =====================================================
-- Migration: Add New Subscription Plans with Enhanced Features
-- Date: 2025-01-XX
-- Purpose: Add 5 new subscription plans with feature flags, configurable duration, and common plan type
-- =====================================================

-- Phase 1: Add Feature Flag Columns
-- =====================================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_advanced_assessments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_report_generation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_custom_branding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_advanced_analytics BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_priority_support BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_email_support BOOLEAN DEFAULT FALSE;

-- Add comments for feature flags
COMMENT ON COLUMN subscription_plans.has_whatsapp IS 'Whether this plan includes WhatsApp messaging capability';
COMMENT ON COLUMN subscription_plans.has_advanced_assessments IS 'Whether this plan includes advanced assessments & questionnaires';
COMMENT ON COLUMN subscription_plans.has_report_generation IS 'Whether this plan includes report generation feature';
COMMENT ON COLUMN subscription_plans.has_custom_branding IS 'Whether this plan includes custom branding feature';
COMMENT ON COLUMN subscription_plans.has_advanced_analytics IS 'Whether this plan includes advanced analytics feature';
COMMENT ON COLUMN subscription_plans.has_priority_support IS 'Whether this plan includes priority support access';
COMMENT ON COLUMN subscription_plans.has_email_support IS 'Whether this plan includes email support access';

-- Phase 2: Add Plan Duration Column
-- =====================================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS plan_duration_days INTEGER;

COMMENT ON COLUMN subscription_plans.plan_duration_days IS 'Configurable duration in days for plans (e.g., 7 days for Free Plan). NULL means no duration limit.';

-- Phase 3: Update max_sessions to Allow NULL (Unlimited Sessions)
-- =====================================================

-- Drop existing constraints on max_sessions (PostgreSQL auto-names them)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop the constraint on max_sessions
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'subscription_plans'::regclass
    AND contype = 'c'
    AND conname LIKE '%max_sessions%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END IF;
END $$;

-- Update max_sessions to allow NULL
ALTER TABLE subscription_plans
ALTER COLUMN max_sessions DROP NOT NULL;

-- Add new constraint that allows NULL or valid range
ALTER TABLE subscription_plans
ADD CONSTRAINT subscription_plans_max_sessions_check CHECK (
  max_sessions IS NULL OR (max_sessions >= min_sessions AND max_sessions >= 0)
);

-- Phase 4: Update plan_type to Include 'common'
-- =====================================================

-- Drop existing plan_type constraint
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;

-- Add new constraint with 'common' option
ALTER TABLE subscription_plans
ADD CONSTRAINT subscription_plans_plan_type_check CHECK (
  plan_type IN ('individual', 'organization', 'common')
);

-- Phase 5: Update check_therapist_range Constraint
-- =====================================================

-- Drop existing constraint
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS check_therapist_range;

-- Add updated constraint that handles 'common' type
ALTER TABLE subscription_plans
ADD CONSTRAINT check_therapist_range CHECK (
  (plan_type = 'individual' AND min_therapists IS NULL AND max_therapists IS NULL) OR
  (plan_type = 'organization' AND min_therapists IS NOT NULL AND max_therapists IS NOT NULL AND min_therapists <= max_therapists) OR
  (plan_type = 'common' AND min_therapists IS NULL AND max_therapists IS NULL)
);

-- Phase 6: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_has_whatsapp ON subscription_plans(has_whatsapp);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_has_video ON subscription_plans(has_video);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_duration_days ON subscription_plans(plan_duration_days);

-- Phase 7: Insert New Subscription Plans
-- =====================================================

-- Plan 1: Free Plan (Common for both Individual Therapist and Organizations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Free Plan') THEN
    UPDATE subscription_plans SET
      plan_type = 'common',
      min_sessions = 0,
      max_sessions = 20,
      has_video = FALSE,
      has_whatsapp = FALSE,
      has_advanced_assessments = FALSE,
      has_report_generation = FALSE,
      has_custom_branding = FALSE,
      has_advanced_analytics = FALSE,
      has_priority_support = FALSE,
      has_email_support = FALSE,
      plan_duration_days = 7,
      plan_order = 1,
      individual_yearly_price = 0.00,
      individual_quarterly_price = 0.00,
      individual_monthly_price = 0.00,
      organization_yearly_price = 0.00,
      organization_quarterly_price = 0.00,
      organization_monthly_price = 0.00,
      is_active = TRUE,
      individual_yearly_enabled = FALSE,
      individual_quarterly_enabled = FALSE,
      individual_monthly_enabled = TRUE,
      organization_yearly_enabled = FALSE,
      organization_quarterly_enabled = FALSE,
      organization_monthly_enabled = TRUE
    WHERE plan_name = 'Free Plan';
  ELSE
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video, 
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_priority_support, has_email_support,
      plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Free Plan', 'common', 0, 20, FALSE,
      FALSE, FALSE, FALSE,
      FALSE, FALSE, FALSE, FALSE,
      7, 1,
      0.00, 0.00, 0.00,
      0.00, 0.00, 0.00,
      TRUE,
      FALSE, FALSE, TRUE,
      FALSE, FALSE, TRUE
    );
  END IF;
END $$;

-- Plan 2: Pro Plan (Individual Therapists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Pro Plan') THEN
    UPDATE subscription_plans SET
      plan_type = 'individual',
      min_sessions = 0,
      max_sessions = NULL,
      has_video = FALSE,
      has_whatsapp = TRUE,
      has_advanced_assessments = TRUE,
      has_report_generation = TRUE,
      has_custom_branding = FALSE,
      has_advanced_analytics = FALSE,
      has_priority_support = FALSE,
      has_email_support = TRUE,
      plan_duration_days = NULL,
      plan_order = 2,
      individual_yearly_price = 5599.00,
      individual_quarterly_price = 1499.00,
      individual_monthly_price = 549.00,
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
    WHERE plan_name = 'Pro Plan';
  ELSE
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video,
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_priority_support, has_email_support,
      plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Pro Plan', 'individual', 0, NULL, FALSE,
      TRUE, TRUE, TRUE,
      FALSE, FALSE, FALSE, TRUE,
      NULL, 2,
      5599.00, 1499.00, 549.00,
      0.00, 0.00, 0.00,
      TRUE,
      TRUE, TRUE, TRUE,
      FALSE, FALSE, FALSE
    );
  END IF;
END $$;

-- Plan 3: Pro Plan Video (Individual Therapists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Pro Plan Video') THEN
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
      has_priority_support = TRUE,
      has_email_support = FALSE,
      plan_duration_days = NULL,
      plan_order = 3,
      individual_yearly_price = 9999.00,
      individual_quarterly_price = 2699.00,
      individual_monthly_price = 999.00,
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
    WHERE plan_name = 'Pro Plan Video';
  ELSE
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video,
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_priority_support, has_email_support,
      plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Pro Plan Video', 'individual', 0, NULL, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE, FALSE,
      NULL, 3,
      9999.00, 2699.00, 999.00,
      0.00, 0.00, 0.00,
      TRUE,
      TRUE, TRUE, TRUE,
      FALSE, FALSE, FALSE
    );
  END IF;
END $$;

-- Plan 4: Pro Plan Magnus (Organizations - Small Org 2-5 therapists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Pro Plan Magnus') THEN
    UPDATE subscription_plans SET
      plan_type = 'organization',
      min_sessions = 0,
      max_sessions = NULL,
      has_video = FALSE,
      has_whatsapp = TRUE,
      has_advanced_assessments = TRUE,
      has_report_generation = TRUE,
      has_custom_branding = FALSE,
      has_advanced_analytics = FALSE,
      has_priority_support = TRUE,
      has_email_support = FALSE,
      min_therapists = 2,
      max_therapists = 5,
      plan_duration_days = NULL,
      plan_order = 4,
      individual_yearly_price = 0.00,
      individual_quarterly_price = 0.00,
      individual_monthly_price = 0.00,
      organization_yearly_price = 5599.00,
      organization_quarterly_price = 1499.00,
      organization_monthly_price = 549.00,
      is_active = TRUE,
      individual_yearly_enabled = FALSE,
      individual_quarterly_enabled = FALSE,
      individual_monthly_enabled = FALSE,
      organization_yearly_enabled = TRUE,
      organization_quarterly_enabled = TRUE,
      organization_monthly_enabled = TRUE
    WHERE plan_name = 'Pro Plan Magnus';
  ELSE
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video,
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_priority_support, has_email_support,
      min_therapists, max_therapists, plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Pro Plan Magnus', 'organization', 0, NULL, FALSE,
      TRUE, TRUE, TRUE,
      FALSE, FALSE, TRUE, FALSE,
      2, 5, NULL, 4,
      0.00, 0.00, 0.00,
      5599.00, 1499.00, 549.00,
      TRUE,
      FALSE, FALSE, FALSE,
      TRUE, TRUE, TRUE
    );
  END IF;
END $$;

-- Plan 5: Pro Plan Video Magnus (Organizations - Small Org 2-5 therapists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Pro Plan Video Magnus') THEN
    UPDATE subscription_plans SET
      plan_type = 'organization',
      min_sessions = 0,
      max_sessions = NULL,
      has_video = TRUE,
      has_whatsapp = TRUE,
      has_advanced_assessments = TRUE,
      has_report_generation = TRUE,
      has_custom_branding = TRUE,
      has_advanced_analytics = TRUE,
      has_priority_support = TRUE,
      has_email_support = FALSE,
      min_therapists = 2,
      max_therapists = 5,
      plan_duration_days = NULL,
      plan_order = 5,
      individual_yearly_price = 0.00,
      individual_quarterly_price = 0.00,
      individual_monthly_price = 0.00,
      organization_yearly_price = 9999.00,
      organization_quarterly_price = 2699.00,
      organization_monthly_price = 999.00,
      is_active = TRUE,
      individual_yearly_enabled = FALSE,
      individual_quarterly_enabled = FALSE,
      individual_monthly_enabled = FALSE,
      organization_yearly_enabled = TRUE,
      organization_quarterly_enabled = TRUE,
      organization_monthly_enabled = TRUE
    WHERE plan_name = 'Pro Plan Video Magnus';
  ELSE
    INSERT INTO subscription_plans (
      plan_name, plan_type, min_sessions, max_sessions, has_video,
      has_whatsapp, has_advanced_assessments, has_report_generation,
      has_custom_branding, has_advanced_analytics, has_priority_support, has_email_support,
      min_therapists, max_therapists, plan_duration_days, plan_order,
      individual_yearly_price, individual_quarterly_price, individual_monthly_price,
      organization_yearly_price, organization_quarterly_price, organization_monthly_price,
      is_active,
      individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
      organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
    ) VALUES (
      'Pro Plan Video Magnus', 'organization', 0, NULL, TRUE,
      TRUE, TRUE, TRUE,
      TRUE, TRUE, TRUE, FALSE,
      2, 5, NULL, 5,
      0.00, 0.00, 0.00,
      9999.00, 2699.00, 999.00,
      TRUE,
      FALSE, FALSE, FALSE,
      TRUE, TRUE, TRUE
    );
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE subscription_plans IS 'Subscription plans with enhanced feature flags, configurable duration, and support for common plan type';

