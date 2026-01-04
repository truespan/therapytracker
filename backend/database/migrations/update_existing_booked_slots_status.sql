-- ============================================================================
-- Migration: Update Existing Booked Slots Status Based on Payment
-- ============================================================================
-- This migration updates all existing slots with status 'booked' to the new
-- status system based on their payment status:
-- - 'confirmed': Fully paid (total payments >= session fee)
-- - 'confirmed_balance_pending': Partially paid (booking fee paid but < session fee)
-- - 'confirmed_payment_pending': No payment received
-- ============================================================================

DO $$
DECLARE
    slot_record RECORD;
    partner_record RECORD;
    session_fee DECIMAL(10, 2);
    booking_fee DECIMAL(10, 2);
    total_paid DECIMAL(10, 2);
    new_status VARCHAR(50);
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all slots with status 'booked'
    FOR slot_record IN 
        SELECT 
            s.id,
            s.partner_id,
            s.appointment_id,
            s.status
        FROM availability_slots s
        WHERE s.status = 'booked'
          AND s.archived_at IS NULL
    LOOP
        -- Get partner fee settings
        SELECT 
            COALESCE(CAST(p.session_fee AS DECIMAL(10, 2)), 0),
            COALESCE(CAST(p.booking_fee AS DECIMAL(10, 2)), 0)
        INTO session_fee, booking_fee
        FROM partners p
        WHERE p.id = slot_record.partner_id;
        
        -- If partner not found, skip (shouldn't happen, but safety check)
        IF NOT FOUND THEN
            RAISE NOTICE 'Partner not found for slot %', slot_record.id;
            CONTINUE;
        END IF;
        
        -- Calculate total paid amount for this slot
        -- Check all possible payment sources and sum them up (using DISTINCT to avoid duplicates)
        SELECT COALESCE(SUM(DISTINCT CAST(rp.amount AS DECIMAL(10, 2))), 0)
        INTO total_paid
        FROM razorpay_payments rp
        LEFT JOIN razorpay_orders ro ON rp.razorpay_order_id = ro.razorpay_order_id
        WHERE rp.status IN ('captured', 'authorized')
          AND (
              -- Check via razorpay_orders.notes
              (ro.notes IS NOT NULL
               AND (
                   (ro.notes->>'slot_id')::INTEGER = slot_record.id
                   OR (ro.notes->>'slot_id')::TEXT = slot_record.id::TEXT
               )
               AND (
                   ro.notes->>'payment_type' = 'booking_fee'
                   OR ro.notes->>'payment_type' = 'remaining_payment'
               ))
              OR
              -- Check via razorpay_payments.metadata (fallback)
              (rp.metadata IS NOT NULL
               AND (
                   (rp.metadata->>'slot_id')::INTEGER = slot_record.id
                   OR (rp.metadata->>'slot_id')::TEXT = slot_record.id::TEXT
               )
               AND (
                   rp.metadata->>'payment_type' = 'booking_fee'
                   OR rp.metadata->>'payment_type' = 'remaining_payment'
               ))
          );
        
        -- If no payments found via slot_id, try checking via appointment_id through earnings
        IF total_paid = 0 AND slot_record.appointment_id IS NOT NULL THEN
            SELECT COALESCE(SUM(CAST(e.amount AS DECIMAL(10, 2))), 0)
            INTO total_paid
            FROM earnings e
            WHERE e.appointment_id = slot_record.appointment_id
              AND e.status IN ('pending', 'available', 'withdrawn');
        END IF;
        
        -- Determine new status based on payment conditions
        IF session_fee = 0 THEN
            -- No session fee configured - treat as confirmed (free session)
            new_status := 'confirmed';
        ELSIF total_paid >= session_fee THEN
            -- Fully paid
            new_status := 'confirmed';
        ELSIF booking_fee > 0 AND total_paid >= booking_fee AND total_paid < session_fee THEN
            -- Partial payment (booking fee paid, but balance pending)
            new_status := 'confirmed_balance_pending';
        ELSIF total_paid > 0 AND total_paid < session_fee THEN
            -- Some payment made but less than booking fee (edge case)
            new_status := 'confirmed_balance_pending';
        ELSIF booking_fee = 0 AND total_paid = 0 THEN
            -- No booking fee configured and no payment received
            new_status := 'confirmed_payment_pending';
        ELSIF total_paid = 0 THEN
            -- No payment received at all
            new_status := 'confirmed_payment_pending';
        ELSE
            -- Default: keep as booked (shouldn't reach here, but safety)
            new_status := 'booked';
        END IF;
        
        -- Update the slot status
        UPDATE availability_slots
        SET status = new_status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = slot_record.id;
        
        updated_count := updated_count + 1;
        
        -- Log the update (optional, for debugging)
        RAISE NOTICE 'Updated slot %: status % -> %, session_fee: %, booking_fee: %, total_paid: %', 
            slot_record.id, slot_record.status, new_status, session_fee, booking_fee, total_paid;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: Updated % slots from status "booked" to new status system', updated_count;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- - All slots with status 'booked' have been evaluated
-- - Status updated based on payment status:
--   * 'confirmed': Fully paid (total payments >= session fee)
--   * 'confirmed_balance_pending': Partially paid (booking fee paid, balance pending)
--   * 'confirmed_payment_pending': No payment received
-- ============================================================================

