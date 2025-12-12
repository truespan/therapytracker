-- Migration: Fix production database - Update USD to INR
-- Description: This migration updates existing partners with USD currency to INR
--              Run this in production if the previous migration was already executed
--              before the USD update was added
-- Date: 2025-01-12
--
-- IMPORTANT: Run this migration in production to fix existing partners with USD

-- Update all partners with USD fee_currency to INR
UPDATE partners
SET fee_currency = 'INR'
WHERE fee_currency = 'USD';

-- Verify the update
SELECT
    'Updated partners with USD to INR' as message,
    COUNT(*) as affected_rows
FROM partners
WHERE fee_currency = 'INR';

-- Check if any USD records remain (should be 0)
SELECT
    'Remaining USD records (should be 0)' as message,
    COUNT(*) as remaining_usd_records
FROM partners
WHERE fee_currency = 'USD';
