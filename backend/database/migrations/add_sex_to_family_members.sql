-- Migration: Add sex column to case_history_family_members table
-- Purpose: Store sex/gender information for siblings in family history
-- Date: 2025-12-10

-- Add sex column to case_history_family_members table
ALTER TABLE case_history_family_members
ADD COLUMN IF NOT EXISTS sex VARCHAR(20);

-- Add comment to column
COMMENT ON COLUMN case_history_family_members.sex IS 'Sex/Gender of the family member (Male/Female/Others)';
