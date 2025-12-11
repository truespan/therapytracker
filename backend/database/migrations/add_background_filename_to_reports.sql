-- Migration: Add background_filename column to generated_reports table
-- This stores the background image used when the report was created,
-- so old reports maintain their original background even if partner changes settings

ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS background_filename VARCHAR(255);

-- Set default value for existing reports (use default background)
UPDATE generated_reports
SET background_filename = 'report-background.jpg'
WHERE background_filename IS NULL;

-- Add comment
COMMENT ON COLUMN generated_reports.background_filename IS 'Background image filename used when this report was generated. Preserves original background even if partner changes default.';

