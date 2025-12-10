-- Add default_report_background column to partners table
-- Stores the filename of the selected background image

ALTER TABLE partners
ADD COLUMN default_report_background VARCHAR(255);

-- Set default value to first background image
UPDATE partners
SET default_report_background = 'report-background.jpg'
WHERE default_report_background IS NULL;

-- Add index for better query performance
CREATE INDEX idx_partners_report_background ON partners(default_report_background);

COMMENT ON COLUMN partners.default_report_background IS 'Filename of the selected report background image from assets folder';
