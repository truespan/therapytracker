-- =====================================================
-- Migration: Add max_appointments to Subscription Plans
-- Date: 2025-01-XX
-- Purpose: Add max_appointments field to subscription_plans table
--          If max_appointments is NULL, it means unlimited appointments
-- =====================================================

-- Add max_appointments column to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_appointments INTEGER;

-- Add constraint to ensure max_appointments is either NULL (unlimited) or >= 0
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_max_appointments_check;

ALTER TABLE subscription_plans
ADD CONSTRAINT subscription_plans_max_appointments_check CHECK (
  max_appointments IS NULL OR max_appointments >= 0
);

-- Add comment to document the column
COMMENT ON COLUMN subscription_plans.max_appointments IS 'Maximum number of appointments per month allowed. NULL means unlimited appointments.';

