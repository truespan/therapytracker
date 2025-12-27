-- Migration: Fix razorpay_orders status constraint to include 'captured'
-- Razorpay returns 'captured' status for successful payments, but our constraint didn't include it

-- Drop the old constraint
ALTER TABLE razorpay_orders
DROP CONSTRAINT IF EXISTS razorpay_orders_status_check;

-- Add new constraint with 'captured' status
ALTER TABLE razorpay_orders
ADD CONSTRAINT razorpay_orders_status_check
CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'captured'));

-- Update any existing orders with 'captured' status (if migration runs after the error)
-- This is safe because we're just ensuring the data is valid
UPDATE razorpay_orders SET status = 'captured' WHERE status = 'captured';

COMMENT ON CONSTRAINT razorpay_orders_status_check ON razorpay_orders IS 'Allows Razorpay order statuses: created, attempted, paid, failed, captured';

