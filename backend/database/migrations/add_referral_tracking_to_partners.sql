-- Migration: Add referral code tracking to partners table
-- This tracks which referral code was used during partner signup and what discount was applied

-- Add referral tracking columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS referral_discount_applied DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS referral_discount_type VARCHAR(20) CHECK (referral_discount_type IN ('percentage', 'fixed'));

-- Create index for analytics/reporting on referral code usage
CREATE INDEX IF NOT EXISTS idx_partners_referral_code_used 
ON partners (referral_code_used);

-- Add comments to explain the fields
COMMENT ON COLUMN partners.referral_code_used IS 'The referral code that was used during partner signup, if any.';
COMMENT ON COLUMN partners.referral_discount_applied IS 'The discount amount that was applied to this partner from the referral code.';
COMMENT ON COLUMN partners.referral_discount_type IS 'The type of discount applied: percentage or fixed amount.';

