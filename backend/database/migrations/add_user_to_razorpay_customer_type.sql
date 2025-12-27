-- Migration: Add 'user' to customer_type constraint for booking fee payments
-- Description: Updates razorpay_orders and razorpay_payments tables to allow 'user' as customer_type
-- Date: 2025-12-27

-- Drop existing constraint on razorpay_orders
ALTER TABLE razorpay_orders 
DROP CONSTRAINT IF EXISTS razorpay_orders_customer_type_check;

-- Add new constraint that includes 'user'
ALTER TABLE razorpay_orders 
ADD CONSTRAINT razorpay_orders_customer_type_check 
CHECK (customer_type IS NULL OR customer_type IN ('partner', 'organization', 'user'));

-- Drop existing constraint on razorpay_payments
ALTER TABLE razorpay_payments 
DROP CONSTRAINT IF EXISTS razorpay_payments_customer_type_check;

-- Add new constraint that includes 'user'
ALTER TABLE razorpay_payments 
ADD CONSTRAINT razorpay_payments_customer_type_check 
CHECK (customer_type IS NULL OR customer_type IN ('partner', 'organization', 'user'));

-- Migration completed
SELECT 'Customer type constraint updated to include user' as message;

