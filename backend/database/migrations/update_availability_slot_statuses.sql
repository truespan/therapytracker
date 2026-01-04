-- ============================================================================
-- Migration: Update Availability Slot Statuses
-- ============================================================================
-- This migration adds new status values for booking confirmation states:
-- - 'confirmed': Full payment received
-- - 'confirmed_balance_pending': Partial payment (booking fee < session fee)
-- - 'confirmed_payment_pending': No payment received yet
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE availability_slots
DROP CONSTRAINT IF EXISTS availability_slots_status_check;

-- Add new constraint with additional status values
ALTER TABLE availability_slots
ADD CONSTRAINT availability_slots_status_check CHECK (status IN (
  'available_online',
  'available_offline',
  'not_available_online',
  'not_available_offline',
  'booked',  -- Keep for backward compatibility
  'confirmed',
  'confirmed_balance_pending',
  'confirmed_payment_pending'
));

-- Add comment
COMMENT ON COLUMN availability_slots.status IS 'Slot status: available_* (available), not_available_* (unavailable), booked (legacy), confirmed (fully paid), confirmed_balance_pending (partial payment), confirmed_payment_pending (no payment)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

