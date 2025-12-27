-- Migration: Add booking fee and session fee fields to partners table
-- Description: Adds session_fee, booking_fee, and fee_currency columns for partner fee management
-- Date: 2025-12-27

-- Add fee columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS session_fee DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS booking_fee DECIMAL(10, 2);

-- Update fee_currency default to INR if it exists, or add it if it doesn't
DO $$
BEGIN
    -- Check if fee_currency column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'partners' 
        AND column_name = 'fee_currency'
    ) THEN
        -- Update default value
        ALTER TABLE partners ALTER COLUMN fee_currency SET DEFAULT 'INR';
    ELSE
        -- Add column with INR default
        ALTER TABLE partners ADD COLUMN fee_currency VARCHAR(3) DEFAULT 'INR';
    END IF;
END $$;

-- Add constraint to ensure fees are non-negative
ALTER TABLE partners 
ADD CONSTRAINT IF NOT EXISTS chk_session_fee_positive 
CHECK (session_fee IS NULL OR session_fee >= 0);

ALTER TABLE partners 
ADD CONSTRAINT IF NOT EXISTS chk_booking_fee_positive 
CHECK (booking_fee IS NULL OR booking_fee >= 0);

-- Add comments for documentation
COMMENT ON COLUMN partners.session_fee IS 'Fee charged per session by the therapist (optional)';
COMMENT ON COLUMN partners.booking_fee IS 'Booking fee collected as part of appointment booking (optional)';
COMMENT ON COLUMN partners.fee_currency IS 'Currency code for fees (ISO 4217 format, e.g., USD, EUR, INR). Default: INR';

-- Migration completed
SELECT 'Booking and session fee fields migration completed successfully' as message;

