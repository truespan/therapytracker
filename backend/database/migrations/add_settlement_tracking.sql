-- Migration: Add settlement tracking to earnings
-- Description: Adds settlement_id column to track Razorpay settlement IDs
-- Date: 2026-01-17

-- Add settlement_id column to earnings table
ALTER TABLE earnings
ADD COLUMN IF NOT EXISTS razorpay_settlement_id VARCHAR(255);

-- Add index for settlement_id lookups
CREATE INDEX IF NOT EXISTS idx_earnings_settlement_id ON earnings(razorpay_settlement_id);

-- Add comment
COMMENT ON COLUMN earnings.razorpay_settlement_id IS 'Razorpay settlement ID (e.g., setl_xxxxx) - links payment to settlement batch';
