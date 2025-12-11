-- Migration: Add fee range fields to partners table
-- Description: Adds fee_min, fee_max, and fee_currency columns for therapist fee information
-- Date: 2025-01-27

-- Add fee range columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS fee_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS fee_max DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS fee_currency VARCHAR(3) DEFAULT 'USD';

-- Add constraint to ensure fee_max >= fee_min if both are provided
ALTER TABLE partners 
ADD CONSTRAINT chk_fee_range 
CHECK (
  (fee_min IS NULL AND fee_max IS NULL) OR
  (fee_min IS NOT NULL AND fee_max IS NOT NULL AND fee_max >= fee_min) OR
  (fee_min IS NULL AND fee_max IS NOT NULL) OR
  (fee_min IS NOT NULL AND fee_max IS NULL)
);

-- Add index for fee range queries (useful for search functionality)
CREATE INDEX IF NOT EXISTS idx_partners_fee_range ON partners(fee_min, fee_max) WHERE fee_min IS NOT NULL AND fee_max IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN partners.fee_min IS 'Minimum fee charged by the therapist (optional)';
COMMENT ON COLUMN partners.fee_max IS 'Maximum fee charged by the therapist (optional)';
COMMENT ON COLUMN partners.fee_currency IS 'Currency code for fee range (ISO 4217 format, e.g., USD, EUR, INR)';
COMMENT ON CONSTRAINT chk_fee_range ON partners IS 'Ensures fee_max is greater than or equal to fee_min when both are provided';

-- Migration completed
SELECT 'Partner fee fields migration completed successfully' as message;

