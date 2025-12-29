-- Migration: Add transaction fee fields to payouts table
-- Description: Adds fields to track Razorpay transaction fees and net payout amounts
-- Date: 2025-01-XX

-- Step 1: Add transaction fee fields to payouts table
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS transaction_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_on_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10, 2);

-- Step 2: Update existing payouts to set net_amount = amount and gross_amount = amount
-- (for existing records where fees were not tracked)
UPDATE payouts
SET net_amount = amount,
    gross_amount = amount
WHERE net_amount IS NULL OR gross_amount IS NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN payouts.transaction_fee IS 'Razorpay transaction fee deducted (base fee before GST)';
COMMENT ON COLUMN payouts.gst_on_fee IS 'GST amount on transaction fee';
COMMENT ON COLUMN payouts.net_amount IS 'Amount after fee deduction (gross_amount - transaction_fee - gst_on_fee)';
COMMENT ON COLUMN payouts.gross_amount IS 'Original amount before fee deduction';

