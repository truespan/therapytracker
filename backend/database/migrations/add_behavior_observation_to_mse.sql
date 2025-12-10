-- Migration: Add behavior_observation column to mental_status_examinations table
-- Purpose: Add Section 16 - Behavior Observation (BO) to Mental Status Examination
-- Date: 2025-12-10

-- Add behavior_observation column to mental_status_examinations table
ALTER TABLE mental_status_examinations
ADD COLUMN IF NOT EXISTS behavior_observation TEXT;

-- Add comment to column
COMMENT ON COLUMN mental_status_examinations.behavior_observation IS 'Section 16: Behavior Observation (BO) - observations of patient behavior';
