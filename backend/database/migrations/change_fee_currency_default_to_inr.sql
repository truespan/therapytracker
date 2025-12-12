-- Migration: Change fee_currency default from USD to INR
-- Description: Updates the default currency for partner fee ranges from USD to INR
-- Date: 2025-01-27

-- Update existing NULL fee_currency values to INR
UPDATE partners
SET fee_currency = 'INR'
WHERE fee_currency IS NULL;

-- Update existing USD fee_currency values to INR (for partners created before this migration)
UPDATE partners
SET fee_currency = 'INR'
WHERE fee_currency = 'USD';

-- Change the default value for new records
ALTER TABLE partners 
ALTER COLUMN fee_currency SET DEFAULT 'INR';

-- Update the comment to reflect the new default
COMMENT ON COLUMN partners.fee_currency IS 'Currency code for fee range (ISO 4217 format, e.g., USD, EUR, INR). Default: INR';

-- Migration completed
SELECT 'Fee currency default changed to INR successfully' as message;

