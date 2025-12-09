-- Add qualification column to partners table
-- This field stores the therapist's professional qualifications

ALTER TABLE partners
ADD COLUMN qualification VARCHAR(255);

-- Set it as NOT NULL after adding (allows existing records to remain)
-- For production, you might want to update existing records first
UPDATE partners SET qualification = 'Not specified' WHERE qualification IS NULL;

ALTER TABLE partners
ALTER COLUMN qualification SET NOT NULL;

-- Add index for better query performance (optional)
CREATE INDEX idx_partners_qualification ON partners(qualification);

COMMENT ON COLUMN partners.qualification IS 'Professional qualification of the therapist/partner';
