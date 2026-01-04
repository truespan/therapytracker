-- Migration: Add referral code and discount fields to organizations table
-- This allows TheraPTrack-controlled organizations to have referral codes with optional discounts

-- Add referral code columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS referral_code_discount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS referral_code_discount_type VARCHAR(20) CHECK (referral_code_discount_type IN ('percentage', 'fixed'));

-- Add check constraint: discount must be >= 0 if set
ALTER TABLE organizations 
ADD CONSTRAINT check_referral_discount_positive 
CHECK (referral_code_discount IS NULL OR referral_code_discount >= 0);

-- Add check constraint: if discount_type is 'percentage', discount must be <= 100
ALTER TABLE organizations 
ADD CONSTRAINT check_referral_discount_percentage 
CHECK (
  referral_code_discount_type != 'percentage' 
  OR referral_code_discount IS NULL 
  OR referral_code_discount <= 100
);

-- Create index for faster referral code lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_organizations_referral_code 
ON organizations (UPPER(referral_code));

-- Add comment to explain the referral code feature
COMMENT ON COLUMN organizations.referral_code IS 'Unique referral code for therapist signup. Only available for TheraPTrack-controlled organizations.';
COMMENT ON COLUMN organizations.referral_code_discount IS 'Discount amount to apply for therapists joining via this referral code.';
COMMENT ON COLUMN organizations.referral_code_discount_type IS 'Type of discount: percentage (0-100) or fixed amount.';

