-- =====================================================
-- Migration: Remove Video Hours and Extra Video Rate Fields
-- Date: 2025-01-XX
-- Purpose: Simplify video feature to just a boolean toggle by removing video_hours and extra_video_rate columns
-- =====================================================

-- Drop the video_hours and extra_video_rate columns from subscription_plans table
ALTER TABLE subscription_plans
DROP COLUMN IF EXISTS video_hours,
DROP COLUMN IF EXISTS extra_video_rate;

-- Add comment to document the change
COMMENT ON COLUMN subscription_plans.has_video IS 'Whether this plan includes video feature (boolean toggle only)';














