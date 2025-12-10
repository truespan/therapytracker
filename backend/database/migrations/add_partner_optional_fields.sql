-- Migration: Add optional fields to partners table
-- Date: 2024
-- Description: Makes age optional and adds work_experience and other_practice_details fields

-- Make age nullable
ALTER TABLE partners
ALTER COLUMN age DROP NOT NULL;

-- Remove the CHECK constraint on age (since it can now be NULL)
ALTER TABLE partners
DROP CONSTRAINT IF EXISTS partners_age_check;

-- Add new CHECK constraint that allows NULL or valid age range
ALTER TABLE partners
ADD CONSTRAINT partners_age_check CHECK (age IS NULL OR (age > 0 AND age <= 150));

-- Add work_experience column
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS work_experience TEXT;

-- Add other_practice_details column
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS other_practice_details TEXT;

-- Add comments for documentation
COMMENT ON COLUMN partners.age IS 'Age of the therapist (optional)';
COMMENT ON COLUMN partners.work_experience IS 'Work experience details of the therapist (optional)';
COMMENT ON COLUMN partners.other_practice_details IS 'Other significant work related details (optional)';

