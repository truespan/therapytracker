const AvailabilitySlot = require('../models/AvailabilitySlot');
const Appointment = require('../models/Appointment');
const googleCalendarService = require('../services/googleCalendarService');
const whatsappService = require('../services/whatsappService');
const User = require('../models/User');
const Partner = require('../models/Partner');
const PartnerSubscription = require('../models/PartnerSubscription');
const Organization = require('../models/Organization');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const db = require('../config/database');

/**
 * Check if WhatsApp is enabled for a partner based on their subscription plan
 * Partners in TheraPTrack controlled organizations always have all features enabled
 * @param {number} partnerId - Partner ID
 * @returns {Promise<boolean>} True if WhatsApp is enabled
 */
const checkPartnerWhatsAppAccess = async (partnerId) => {
  try {
    // First check if partner's organization is TheraPTrack controlled
    const partner = await Partner.findById(partnerId);
    if (partner && partner.organization_id) {
      const organization = await Organization.findById(partner.organization_id);
      if (organization && organization.theraptrack_controlled === true) {
        // Partners in TheraPTrack controlled organizations always have all features
        return true;
      }
    }
    
    const subscription = await PartnerSubscription.getActiveSubscription(partnerId);
    if (!subscription) {
      // No active subscription, default to false
      return false;
    }
    
    // Get the plan details to check has_whatsapp
    const plan = await SubscriptionPlan.findById(subscription.subscription_plan_id);
    return plan && plan.has_whatsapp === true;
  } catch (error) {
    console.error(`[WhatsApp] Error checking partner WhatsApp access for partner ${partnerId}:`, error.message);
    return false;
  }
};

/**
 * Check if WhatsApp is enabled for an organization based on their subscription plan
 * TheraPTrack controlled organizations always have all features enabled
 * @param {number} organizationId - Organization ID
 * @returns {Promise<boolean>} True if WhatsApp is enabled
 */
const checkOrganizationWhatsAppAccess = async (organizationId) => {
  try {
    // First check if organization is TheraPTrack controlled
    const organization = await Organization.findById(organizationId);
    if (organization && organization.theraptrack_controlled === true) {
      // TheraPTrack controlled organizations always have all features
      return true;
    }
    
    const subscription = await Organization.getActiveSubscription(organizationId);
    if (!subscription || !subscription.subscription_plan_id) {
      // No active subscription, default to false
      return false;
    }
    
    // Get the plan details to check has_whatsapp
    const plan = await SubscriptionPlan.findById(subscription.subscription_plan_id);
    return plan && plan.has_whatsapp === true;
  } catch (error) {
    console.error(`[WhatsApp] Error checking organization WhatsApp access for org ${organizationId}:`, error.message);
    return false;
  }
};

/**
 * Create a new availability slot
 */
const createSlot = async (req, res) => {
  try {
    const { partner_id, slot_date, start_time, end_time, status, timezone } = req.body;

    // DEBUG: Log what we received
    console.log('\n=== CREATE SLOT REQUEST ===');
    console.log('Timezone received:', timezone || 'NOT PROVIDED');
    console.log('Full request:', { partner_id, slot_date, start_time, end_time, status, timezone });
    console.log('==========================\n');

    // Validation
    if (!partner_id || !slot_date || !start_time || !end_time || !status) {
      return res.status(400).json({
        error: 'partner_id, slot_date, start_time, end_time, and status are required'
      });
    }

    // Validate and normalize status value
    // Map legacy 'not_available' to 'not_available_offline' (default)
    const validStatuses = [
      'available_online',
      'available_offline',
      'not_available_online',
      'not_available_offline',
      'booked',
      'confirmed',
      'confirmed_balance_pending',
      'confirmed_payment_pending'
    ];

    let normalizedStatus = status;
    if (status === 'not_available') {
      // Default to offline for backward compatibility
      normalizedStatus = 'not_available_offline';
      console.warn('Status "not_available" mapped to "not_available_offline" for backward compatibility');
    }

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate start_time < end_time
    if (start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be before end_time'
      });
    }

    // NOTE:
    // Do NOT cap availability slot creation based on max_appointments.
    // max_appointments is enforced when a slot is actually booked (appointment creation),
    // not when a therapist publishes/creates availability.

    // Check for Google Calendar conflicts if creating an "available" slot
    let conflictWarning = null;
    if (status.startsWith('available')) {
      // Use dateUtils to properly construct UTC timestamps for conflict checking
      const dateUtils = require('../utils/dateUtils');
      const userTimezone = timezone || 'UTC';
      
      const startDateObj = dateUtils.combineDateAndTime(slot_date, start_time, userTimezone);
      const endDateObj = dateUtils.combineDateAndTime(slot_date, end_time, userTimezone);
      
      const start_datetime = dateUtils.formatForPostgres(startDateObj);
      const end_datetime = dateUtils.formatForPostgres(endDateObj);

      console.log('\n=== CONFLICT CHECK DEBUG ===');
      console.log('Input:', { slot_date, start_time, end_time, timezone: userTimezone });
      console.log('Checking conflicts for:', { start_datetime, end_datetime });
      console.log('===========================\n');

      const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
        partner_id,
        start_datetime,
        end_datetime
      );

      console.log('\n=== CONFLICT CHECK RESULTS ===');
      console.log('Found conflicts:', conflicts.length);
      if (conflicts.length > 0) {
        conflicts.forEach(c => {
          console.log('Conflict:', {
            title: c.title,
            start: c.appointment_date || c.session_date,
            end: c.end_date,
            type: c.conflict_type
          });
        });
      }
      console.log('==============================\n');

      if (conflicts.length > 0) {
        conflictWarning = {
          has_conflict: true,
          conflicts: conflicts.map(c => ({
            id: c.id,
            title: c.title,
            start: c.appointment_date || c.session_date,
            end: c.end_date,
            user_name: c.user_name,
            user_email: c.user_email,
            type: c.conflict_type
          }))
        };
      }
    }

    // Create the slot
    const newSlot = await AvailabilitySlot.create({
      partner_id,
      slot_date,
      start_time,
      end_time,
      status: normalizedStatus,
      timezone // Pass timezone for proper UTC conversion
    });

    // Update conflict tracking if there was a conflict
    if (conflictWarning) {
      await AvailabilitySlot.updateConflictStatus(
        newSlot.id,
        true,
        JSON.stringify(conflictWarning.conflicts)
      );
    }

    res.status(201).json({
      message: 'Availability slot created successfully',
      slot: newSlot,
      conflict_warning: conflictWarning
    });
  } catch (error) {
    console.error('Create slot error:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A slot already exists at this time'
      });
    }

    res.status(500).json({
      error: 'Failed to create availability slot',
      details: error.message
    });
  }
};

/**
 * Get all slots for a partner (partner view - includes unpublished)
 */
const getPartnerSlots = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    // Default to next 4 weeks (28 days) if not specified
    let startDate = start_date;
    let endDate = end_date;

    if (!startDate || !endDate) {
      const dateUtils = require('../utils/dateUtils');
      const today = dateUtils.getCurrentUTC();
      startDate = dateUtils.formatDate(today);

      const fourWeeksLater = dateUtils.addDays(today, 27);
      endDate = dateUtils.formatDate(fourWeeksLater);
    }

    const slots = await AvailabilitySlot.findByPartner(partnerId, startDate, endDate);

    res.json({
      slots,
      date_range: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Get partner slots error:', error);
    res.status(500).json({
      error: 'Failed to fetch availability slots',
      details: error.message
    });
  }
};

/**
 * Get published slots for client view
 */
const getClientSlots = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;

    // TODO: Verify client has relationship with partner
    // For now, allow any authenticated user to view

    // Get next 4 weeks (28 days) using dateUtils
    const dateUtils = require('../utils/dateUtils');
    const today = dateUtils.getCurrentUTC();
    const startDate = dateUtils.formatDate(today);

    const fourWeeksLater = dateUtils.addDays(today, 27);
    const endDate = dateUtils.formatDate(fourWeeksLater);

    const slots = await AvailabilitySlot.findPublishedByPartner(partnerId, startDate, endDate);

    res.json({
      slots,
      date_range: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Get client slots error:', error);
    res.status(500).json({
      error: 'Failed to fetch availability slots',
      details: error.message
    });
  }
};

/**
 * Mask user name for privacy (shows first letter and asterisks)
 */
const maskUserName = (name) => {
  if (!name) return null;
  if (name.length <= 1) return '*';
  return name.charAt(0).toUpperCase() + '*'.repeat(Math.min(name.length - 1, 5));
};

/**
 * Get published slots by partner_id (public endpoint - no authentication required)
 * Includes booked slots with masked user names for privacy
 */
const getPublicSlotsByPartnerId = async (req, res) => {
  try {
    const { partner_id } = req.params;
    
    // Find partner by partner_id
    const partner = await Partner.findByPartnerId(partner_id);
    if (!partner) {
      return res.status(404).json({ error: 'Therapist not found' });
    }

    // Get next 4 weeks (28 days) using dateUtils
    const dateUtils = require('../utils/dateUtils');
    const today = dateUtils.getCurrentUTC();
    const startDate = dateUtils.formatDate(today);

    const fourWeeksLater = dateUtils.addDays(today, 27);
    const endDate = dateUtils.formatDate(fourWeeksLater);

    const slots = await AvailabilitySlot.findPublishedByPartner(partner.id, startDate, endDate);

    // Process slots to mask booked user names
    const processedSlots = slots.map(slot => {
      const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
      const isBooked = bookedStatuses.includes(slot.status);
      
      // Mask user name for privacy in public view
      const maskedSlot = { ...slot };
      if (isBooked && slot.booked_by_user_name) {
        maskedSlot.booked_by_user_name = maskUserName(slot.booked_by_user_name);
      } else if (isBooked) {
        maskedSlot.booked_by_user_name = 'Booked';
      }
      
      return maskedSlot;
    });

    res.json({
      slots: processedSlots,
      date_range: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Get public slots error:', error);
    res.status(500).json({
      error: 'Failed to fetch availability slots',
      details: error.message
    });
  }
};

/**
 * Update a slot
 */
const updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { slot_date, start_time, end_time, status } = req.body;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Prevent editing booked/confirmed slots
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (bookedStatuses.includes(slot.status)) {
      return res.status(400).json({
        error: 'Cannot edit a booked slot. Please delete and create a new one instead.'
      });
    }

    // Validate and normalize status value if provided
    let normalizedStatus = status;
    if (status) {
      const validStatuses = [
        'available_online',
        'available_offline',
        'not_available_online',
        'not_available_offline',
        'booked',
        'confirmed',
        'confirmed_balance_pending',
        'confirmed_payment_pending'
      ];

      if (status === 'not_available') {
        // Default to offline for backward compatibility
        normalizedStatus = 'not_available_offline';
        console.warn('Status "not_available" mapped to "not_available_offline" for backward compatibility');
      }

      if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Validate start_time < end_time if both provided
    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be before end_time'
      });
    }

    // Re-check conflicts if becoming available
    let conflictWarning = null;
    const statusToCheck = normalizedStatus || status || slot.status;
    if (statusToCheck && statusToCheck.startsWith('available')) {
      const checkDate = slot_date || slot.slot_date;
      const checkStartTime = start_time || slot.start_time;
      const checkEndTime = end_time || slot.end_time;

      // Use dateUtils to properly construct UTC timestamps for conflict checking
      const dateUtils = require('../utils/dateUtils');
      const userTimezone = req.body.timezone || 'UTC';
      
      const startDateObj = dateUtils.combineDateAndTime(checkDate, checkStartTime, userTimezone);
      const endDateObj = dateUtils.combineDateAndTime(checkDate, checkEndTime, userTimezone);
      
      const start_datetime = dateUtils.formatForPostgres(startDateObj);
      const end_datetime = dateUtils.formatForPostgres(endDateObj);

      console.log('\n=== UPDATE SLOT CONFLICT CHECK ===');
      console.log('Input:', { checkDate, checkStartTime, checkEndTime, timezone: userTimezone });
      console.log('Checking conflicts for:', { start_datetime, end_datetime });
      console.log('==================================\n');

      const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
        slot.partner_id,
        start_datetime,
        end_datetime
      );

      console.log('\n=== UPDATE CONFLICT RESULTS ===');
      console.log('Found conflicts:', conflicts.length);
      if (conflicts.length > 0) {
        conflicts.forEach(c => {
          console.log('Conflict:', {
            title: c.title,
            start: c.appointment_date || c.session_date,
            end: c.end_date,
            type: c.conflict_type
          });
        });
      }
      console.log('===============================\n');

      if (conflicts.length > 0) {
        conflictWarning = {
          has_conflict: true,
          conflicts: conflicts.map(c => ({
            id: c.id,
            title: c.title,
            start: c.appointment_date || c.session_date,
            end: c.end_date,
            user_name: c.user_name,
            type: c.conflict_type
          }))
        };
      }
    }

    const updatedSlot = await AvailabilitySlot.update(id, {
      slot_date,
      start_time,
      end_time,
      status: normalizedStatus
    });

    // Update conflict tracking
    if (conflictWarning) {
      await AvailabilitySlot.updateConflictStatus(
        id,
        true,
        JSON.stringify(conflictWarning.conflicts)
      );
    }

    res.json({
      message: 'Slot updated successfully',
      slot: updatedSlot,
      conflict_warning: conflictWarning
    });
  } catch (error) {
    console.error('Update slot error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A slot already exists at this time'
      });
    }

    res.status(500).json({
      error: 'Failed to update slot',
      details: error.message
    });
  }
};

/**
 * Delete (archive) a slot
 * If slot is booked, also delete the associated appointment
 */
const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // If slot is booked/confirmed, delete the associated appointment first
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (bookedStatuses.includes(slot.status) && slot.appointment_id) {
      try {
        await Appointment.delete(slot.appointment_id);
        console.log(`Deleted associated appointment ${slot.appointment_id} for booked slot ${id}`);
      } catch (appointmentError) {
        console.error('Failed to delete associated appointment:', appointmentError);
        // Continue with slot deletion even if appointment deletion fails
      }
    }

    const archivedSlot = await AvailabilitySlot.archive(id);

    res.json({
      message: bookedStatuses.includes(slot.status)
        ? 'Booked slot and associated appointment deleted successfully'
        : 'Slot deleted successfully',
      slot: archivedSlot,
      appointment_deleted: bookedStatuses.includes(slot.status)
    });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({
      error: 'Failed to delete slot',
      details: error.message
    });
  }
};

/**
 * Publish all unpublished slots for a partner
 */
const publishSlots = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const publishedSlots = await AvailabilitySlot.publishSlotsForPartner(partnerId);

    res.json({
      message: `Successfully published ${publishedSlots.length} slot(s)`,
      count: publishedSlots.length,
      slots: publishedSlots
    });
  } catch (error) {
    console.error('Publish slots error:', error);
    res.status(500).json({
      error: 'Failed to publish slots',
      details: error.message
    });
  }
};

/**
 * Book a slot (client action)
 */
const bookSlot = async (req, res) => {
  const client = await db.getClient();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Ensure timezone is set to UTC for this transaction
    await client.query('SET timezone = "UTC"');
    await client.query('BEGIN');

    // Lock the slot row with explicit formatting for date/time fields
    const lockQuery = `
      SELECT *,
        TO_CHAR(slot_date, 'YYYY-MM-DD') as slot_date_formatted,
        TO_CHAR(start_time, 'HH24:MI') as start_time_formatted,
        TO_CHAR(end_time, 'HH24:MI') as end_time_formatted
      FROM availability_slots
      WHERE id = $1
      FOR UPDATE
    `;
    const lockResult = await client.query(lockQuery, [id]);
    const slot = lockResult.rows[0];

    if (!slot) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Verify slot is available and published
    // Check for all booked/confirmed statuses
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (bookedStatuses.includes(slot.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is already booked' });
    }

    if (!slot.is_available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is not available for booking' });
    }

    if (!slot.is_published) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is not published yet' });
    }

    // Check for Google Calendar conflicts
    const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
      slot.partner_id,
      slot.start_datetime,
      slot.end_datetime
    );

    let appointmentId = null;
    let googleConflict = false;

    // If NO conflict, create appointment and sync to Google Calendar
    if (conflicts.length === 0) {
      try {
        // Check max appointments limit
        const subscription = await PartnerSubscription.getActiveSubscription(slot.partner_id);
        if (subscription && subscription.max_appointments !== null && subscription.max_appointments !== undefined) {
          const currentMonthCount = await Appointment.countCurrentMonthAppointments(slot.partner_id);
          if (currentMonthCount >= subscription.max_appointments) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
              error: `You have reached max appointments limit of ${subscription.max_appointments}` 
            });
          }
        }

        // Use the start_datetime and end_datetime fields directly - they're already UTC timestamptz
        // No need to manually construct ISO strings which can introduce timezone bugs
        const startDatetime = new Date(slot.start_datetime);
        const endDatetime = new Date(slot.end_datetime);

        // Calculate duration in minutes
        const dateUtils = require('../utils/dateUtils');
        const durationMinutes = dateUtils.differenceInMinutes(endDatetime, startDatetime);

        console.log('Booking slot - ID:', id);
        console.log('Start datetime (UTC):', startDatetime.toISOString());
        console.log('End datetime (UTC):', endDatetime.toISOString());
        console.log('Duration (minutes):', durationMinutes);

        const appointmentTitle = `Therapy Session - ${slot.location_type === 'online' ? 'Online' : 'In-Person'}`;
        const appointment = await Appointment.create({
          partner_id: slot.partner_id,
          user_id: userId,
          title: appointmentTitle,
          appointment_date: startDatetime.toISOString(),
          end_date: endDatetime.toISOString(),
          duration_minutes: durationMinutes,
          notes: `Booked via availability slot #${id}`,
          timezone: 'UTC'
        });

        appointmentId = appointment.id;

        // Sync to Google Calendar (non-blocking)
        try {
          await googleCalendarService.syncAppointmentToGoogle(appointment.id);
        } catch (gcalError) {
          console.error('Google Calendar sync failed:', gcalError.message);
          // Don't fail the booking if GCal sync fails
        }
      } catch (appointmentError) {
        console.error('Appointment creation error:', appointmentError);
        await client.query('ROLLBACK');
        return res.status(500).json({
          error: 'Failed to create appointment',
          details: appointmentError.message
        });
      }
    } else {
      // If conflict exists, skip appointment creation
      googleConflict = true;
    }

    // Get partner fee settings to determine booking status
    const partner = await Partner.findById(slot.partner_id);
    const sessionFee = partner ? (parseFloat(partner.session_fee) || 0) : 0;
    
    // Check if payment has already been made for this slot
    // Since we now collect full session_fee upfront, check for existing payment
    let bookingStatus = 'booked'; // Default for backward compatibility
    let hasPayment = false;
    let totalPaid = 0;
    
    if (sessionFee > 0) {
      // Check if there's a payment record for this slot
      // Handle both JSONB and string formats for notes field
      const paymentCheckQuery = `
        SELECT COALESCE(SUM(rp.amount), 0) as total_paid
        FROM razorpay_payments rp
        INNER JOIN razorpay_orders ro ON rp.razorpay_order_id = ro.razorpay_order_id
        WHERE (
          (ro.notes->>'slot_id')::integer = $1
          OR (ro.notes->>'slot_id') = $1::text
          OR (ro.notes::text LIKE '%"slot_id":' || $1 || '%')
        )
        AND (
          ro.notes->>'payment_type' = 'booking_fee'
          OR ro.notes::text LIKE '%"payment_type":"booking_fee"%'
        )
        AND rp.status IN ('captured', 'authorized')
      `;
      const paymentResult = await client.query(paymentCheckQuery, [id]);
      totalPaid = parseFloat(paymentResult.rows[0]?.total_paid || 0);
      hasPayment = totalPaid > 0;
      
      console.log(`[BOOK_SLOT] Slot ${id}: sessionFee=${sessionFee}, totalPaid=${totalPaid}, hasPayment=${hasPayment}`);
      
      if (hasPayment && totalPaid >= sessionFee) {
        // Full payment received - set to confirmed
        bookingStatus = 'confirmed';
        console.log(`[BOOK_SLOT] Slot ${id}: Full payment received, setting status to 'confirmed'`);
      } else if (hasPayment && totalPaid < sessionFee) {
        // Partial payment (shouldn't happen with new flow, but handle for backward compatibility)
        bookingStatus = 'confirmed_balance_pending';
        console.log(`[BOOK_SLOT] Slot ${id}: Partial payment (${totalPaid}/${sessionFee}), setting status to 'confirmed_balance_pending'`);
      } else {
        // No payment made yet - payment pending
        bookingStatus = 'confirmed_payment_pending';
        console.log(`[BOOK_SLOT] Slot ${id}: No payment found, setting status to 'confirmed_payment_pending'`);
      }
    } else {
      // No session fee - free booking, set to confirmed
      bookingStatus = 'confirmed';
      console.log(`[BOOK_SLOT] Slot ${id}: No session fee, setting status to 'confirmed'`);
    }

    // Update slot with appropriate status
    const updateQuery = `
      UPDATE availability_slots
      SET status = $4,
          is_available = FALSE,
          booked_by_user_id = $1,
          booked_at = CURRENT_TIMESTAMP,
          appointment_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [userId, appointmentId, id, bookingStatus]);
    const bookedSlot = updateResult.rows[0];

    await client.query('COMMIT');

    // Send WhatsApp notifications (non-blocking)
    if (appointmentId && !googleConflict) {
      try {
        // Get user and partner details for notification
        const user = await User.findById(userId);
        const partner = await Partner.findById(slot.partner_id);
        
        // Check if partner has WhatsApp access
        const partnerHasWhatsApp = await checkPartnerWhatsAppAccess(slot.partner_id);
        if (!partnerHasWhatsApp) {
          console.log(`[WhatsApp] WhatsApp not enabled for partner ${slot.partner_id} (Free Plan or Starter Plan)`);
          // Skip WhatsApp notifications but continue with booking
        } else {
          // Check organization access if applicable
          let organizationHasWhatsApp = true; // Default to true if no organization
          if (partner && partner.organization_id) {
            organizationHasWhatsApp = await checkOrganizationWhatsAppAccess(partner.organization_id);
            if (!organizationHasWhatsApp) {
              console.log(`[WhatsApp] WhatsApp not enabled for organization ${partner.organization_id} (Free Plan or Starter Plan)`);
              // Skip WhatsApp notifications but continue with booking
            }
          }

          // Only send notifications if both partner and organization (if applicable) have WhatsApp access
          if (partnerHasWhatsApp && organizationHasWhatsApp) {
            // Send notification to client
            if (user && user.contact) {
              console.log(`[WhatsApp] Preparing to send client notification for slot ${id}`);
              console.log(`[WhatsApp] Client details:`, {
                userId: userId,
                userName: user.name,
                contact: user.contact,
                contactFormatted: user.contact
              });
              
              console.log(`[WhatsApp] 📋 Preparing client notification for slot ${id}:`, {
                userId: userId,
                userName: user.name,
                userContact: user.contact,
                partnerId: slot.partner_id,
                partnerName: partner ? partner.name : 'N/A'
              });

              const bookingAmount = partner ? (parseFloat(partner.booking_fee) || 0) : 0;
              const feeCurrency = partner ? (partner.fee_currency || 'INR') : 'INR';
              
              const clientAppointmentData = {
                userName: user.name,
                therapistName: partner ? partner.name : 'Your therapist',
                appointmentDate: slot.start_datetime,
                appointmentTime: new Date(slot.start_datetime).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata'
                }),
                timezone: 'UTC',
                appointmentType: `Therapy Session - ${slot.location_type === 'online' ? 'Online' : 'In-Person'}`,
                duration: Math.round((new Date(slot.end_datetime) - new Date(slot.start_datetime)) / (1000 * 60)),
                bookingAmount: bookingAmount,
                feeCurrency: feeCurrency
              };

              console.log(`[WhatsApp] 📤 Calling sendAppointmentConfirmation for CLIENT:`, {
                toPhoneNumber: user.contact,
                appointmentId: appointmentId,
                userId: userId
              });

              try {
                const clientResult = await whatsappService.sendAppointmentConfirmation(
                  user.contact,
                  clientAppointmentData,
                  appointmentId,
                  userId
                );

                console.log(`[WhatsApp] 📨 CLIENT sendAppointmentConfirmation returned:`, clientResult);

                if (clientResult.success) {
                  console.log(`[WhatsApp] ✅ Client notification sent successfully for booked slot ${id}`);
                  console.log(`[WhatsApp] Client result:`, clientResult);
                } else {
                  console.error(`[WhatsApp] ❌ Failed to send client notification for booked slot ${id}:`, clientResult.error);
                  console.error(`[WhatsApp] Client result details:`, clientResult);
                }
              } catch (clientError) {
                console.error(`[WhatsApp] ❌ Exception sending client notification for booked slot ${id}:`, clientError);
                console.error(`[WhatsApp] Client error stack:`, clientError.stack);
              }
            } else {
              console.warn(`[WhatsApp] ⚠️  Skipping client notification for slot ${id}:`, {
                hasUser: !!user,
                hasContact: !!(user && user.contact),
                userId: userId,
                userObject: user ? { id: user.id, name: user.name, contact: user.contact } : null
              });
            }

            // Send notification to therapist (with delay)
            if (partner && partner.contact) {
              // Format date as "Sunday, 4 January 2026"
              const appointmentDateObj = new Date(slot.start_datetime);
              const formattedDate = appointmentDateObj.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Kolkata'
              });
              
              // Format time as "10 am" (remove :00 minutes)
              const timeString = appointmentDateObj.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              });
              // Convert "10:00 am" to "10 am", keep "10:30 am" as is
              const formattedTime = timeString.replace(':00 ', ' ').toLowerCase();

              // Prepare template parameters in the specified order
              const therapistTemplateParams = [
                partner.name, // Parameter 1: Therapist name
                user ? user.name : 'Client', // Parameter 2: Client name
                `Therapy Session - ${slot.location_type === 'online' ? 'Online' : 'Offline'}`, // Parameter 3: Event name ("Therapy Session - Online" or "Therapy Session - Offline")
                formattedDate, // Parameter 4: Date (e.g., "Sunday, 4 January 2026")
                formattedTime // Parameter 5: Time (e.g., "10 am")
              ];

              // Get template name from WhatsApp service (uses environment variable)
              const templateName = whatsappService.templateNames.therapistAppointmentNotification || 'theraptrack_therapist_appointment_notification';

              // Send therapist notification after a few seconds delay
              setTimeout(async () => {
                try {
                  const therapistResult = await whatsappService.sendTherapistAppointmentNotificationTemplate(
                    partner.contact,
                    templateName,
                    therapistTemplateParams,
                    appointmentId,
                    slot.partner_id
                  );

                  if (therapistResult.success) {
                    console.log(`[WhatsApp] ✅ Therapist notification sent successfully for booked slot ${id} (delayed)`);
                  } else {
                    console.error(`[WhatsApp] ❌ Failed to send therapist notification for booked slot ${id}:`, therapistResult.error);
                  }
                } catch (therapistError) {
                  console.error(`[WhatsApp] ❌ Exception sending delayed therapist notification for booked slot ${id}:`, therapistError);
                }
              }, 3000); // 3 seconds delay
            }
          } // End of if (partnerHasWhatsApp && organizationHasWhatsApp)
        } // End of else (partnerHasWhatsApp check)
      } catch (notificationError) {
        console.error(`[WhatsApp] Error sending notifications for booked slot ${id}:`, notificationError.message);
      }
    }

    res.json({
      message: 'Slot booked successfully',
      slot: bookedSlot,
      appointment_id: appointmentId,
      google_conflict: googleConflict,
      conflict_details: googleConflict ? conflicts.map(c => ({
        title: c.title,
        start: c.appointment_date || c.session_date,
        type: c.conflict_type
      })) : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Book slot error:', error);
    res.status(500).json({
      error: 'Failed to book slot',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Cancel booking only - retains the availability slot
 * Sets slot status back to available and deletes associated appointment
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Check if slot is booked
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (!bookedStatuses.includes(slot.status)) {
      return res.status(400).json({ error: 'Slot is not booked' });
    }

    // Delete associated appointment if exists
    if (slot.appointment_id) {
      try {
        await Appointment.delete(slot.appointment_id);
        console.log(`Deleted associated appointment ${slot.appointment_id} for cancelled booking on slot ${id}`);
      } catch (appointmentError) {
        console.error('Failed to delete associated appointment:', appointmentError);
        // Continue with slot update even if appointment deletion fails
      }
    }

    // Determine the original status based on location_type
    const originalStatus = slot.location_type === 'online' ? 'available_online' : 'available_offline';

    // Update slot to make it available again
    const updateQuery = `
      UPDATE availability_slots
      SET status = $1,
          is_available = TRUE,
          booked_by_user_id = NULL,
          booked_at = NULL,
          appointment_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(updateQuery, [originalStatus, id]);
    const updatedSlot = result.rows[0];

    res.json({
      message: 'Booking cancelled successfully. Availability slot has been retained.',
      slot: updatedSlot
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      error: 'Failed to cancel booking',
      details: error.message
    });
  }
};

/**
 * Get payment information for a booked slot
 */
const getPaymentInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await AvailabilitySlot.findById(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Check if slot is booked
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (!bookedStatuses.includes(slot.status)) {
      return res.json({
        amount_paid: 0,
        balance_pending: 0,
        session_fee: 0,
        booking_fee: 0,
        currency: 'INR',
        has_payment: false
      });
    }

    // Get partner fee settings
    const partner = await Partner.findById(slot.partner_id);
    const sessionFee = partner ? (parseFloat(partner.session_fee) || 0) : 0;
    const bookingFee = partner ? (parseFloat(partner.booking_fee) || 0) : 0;
    const currency = partner ? (partner.fee_currency || 'INR') : 'INR';

    // Query razorpay orders and payments for this slot
    // Handle both JSONB and string formats for notes field
    const paymentQuery = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN rp.status = 'captured' THEN rp.amount
            ELSE 0
          END
        ), 0) as total_paid
      FROM razorpay_orders ro
      LEFT JOIN razorpay_payments rp ON ro.razorpay_order_id = rp.razorpay_order_id
      WHERE 
        (
          (ro.notes->>'slot_id')::text = $1::text
          OR (ro.notes->>'slot_id')::integer = $1
        )
        AND (
          ro.notes->>'payment_type' = 'booking_fee' 
          OR ro.notes->>'payment_type' = 'remaining_payment'
        )
    `;
    
    const paymentResult = await db.query(paymentQuery, [id]);
    const totalPaid = parseFloat(paymentResult.rows[0]?.total_paid || 0);

    const balancePending = Math.max(0, sessionFee - totalPaid);

    res.json({
      amount_paid: totalPaid,
      balance_pending: balancePending,
      session_fee: sessionFee,
      booking_fee: bookingFee,
      currency: currency,
      has_payment: totalPaid > 0
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    res.status(500).json({
      error: 'Failed to get payment information',
      details: error.message
    });
  }
};

/**
 * Book a slot publicly (without authentication) - creates user account and books slot
 * This is called after payment verification
 */
const bookSlotPublic = async (req, res) => {
  const client = await db.getClient();

  try {
    const { slot_id, clientData } = req.body;
    const { name, age, sex, location, contact, whatsapp_number, email } = clientData;

    // Validation
    if (!slot_id || !name || !age || !sex || !contact || !whatsapp_number) {
      return res.status(400).json({ 
        error: 'Missing required fields: slot_id, name, age, sex, contact, and whatsapp_number are required' 
      });
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      return res.status(400).json({ error: 'Invalid age. Must be between 1 and 150.' });
    }

    // Validate contact format
    const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
    if (!phoneRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid contact number format. Must include country code (e.g., +919876543210)' });
    }

    if (!phoneRegex.test(whatsapp_number)) {
      return res.status(400).json({ error: 'Invalid WhatsApp number format. Must include country code (e.g., +919876543210)' });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Ensure timezone is set to UTC for this transaction
    await client.query('SET timezone = "UTC"');
    await client.query('BEGIN');

    // Lock the slot row
    const lockQuery = `
      SELECT *,
        TO_CHAR(slot_date, 'YYYY-MM-DD') as slot_date_formatted,
        TO_CHAR(start_time, 'HH24:MI') as start_time_formatted,
        TO_CHAR(end_time, 'HH24:MI') as end_time_formatted
      FROM availability_slots
      WHERE id = $1
      FOR UPDATE
    `;
    const lockResult = await client.query(lockQuery, [slot_id]);
    const slot = lockResult.rows[0];

    if (!slot) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Verify slot is available and published
    const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
    if (bookedStatuses.includes(slot.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is already booked' });
    }

    if (!slot.is_available || !slot.is_published) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Slot is not available for booking' });
    }

    // Check if user already exists (by contact or email)
    let userId = null;
    let isExistingUser = false;

    // Check by contact first
    const existingUserByContact = await User.findByContact(contact);
    if (existingUserByContact) {
      userId = existingUserByContact.id;
      isExistingUser = true;
      // Update user if needed (whatsapp_number, email, location)
      await User.update(userId, {
        whatsapp_number: whatsapp_number || existingUserByContact.whatsapp_number,
        email: email || existingUserByContact.email,
        address: location || existingUserByContact.address
      });
    } else if (email) {
      // Check by email if contact not found
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        userId = existingUserByEmail.id;
        isExistingUser = true;
        // Update user if needed
        await User.update(userId, {
          whatsapp_number: whatsapp_number || existingUserByEmail.whatsapp_number,
          address: location || existingUserByEmail.address
        });
      }
    }

    // Create new user if doesn't exist
    if (!userId) {
      try {
        const newUser = await User.create({
          name,
          age: ageNum,
          sex,
          email: email || null,
          contact,
          whatsapp_number,
          address: location || null
        }, client);
        userId = newUser.id;
      } catch (createError) {
        await client.query('ROLLBACK');
        if (createError.code === '23505' && createError.constraint === 'users_contact_unique') {
          // Contact already exists - try to find and use existing user
          const existingUser = await User.findByContact(contact);
          if (existingUser) {
            userId = existingUser.id;
            isExistingUser = true;
            // Update user info
            await User.update(userId, {
              whatsapp_number: whatsapp_number || existingUser.whatsapp_number,
              email: email || existingUser.email,
              address: location || existingUser.address
            });
            // Restart transaction
            await client.query('BEGIN');
          } else {
            return res.status(400).json({ error: 'A user with this contact number already exists' });
          }
        } else {
          throw createError;
        }
      }
    }

    // Link user to partner if not already linked
    await User.assignToPartner(userId, slot.partner_id, client);

    // Check for Google Calendar conflicts
    const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
      slot.partner_id,
      slot.start_datetime,
      slot.end_datetime
    );

    let appointmentId = null;
    let googleConflict = false;

    // If NO conflict, create appointment and sync to Google Calendar
    if (conflicts.length === 0) {
      try {
        // Check max appointments limit
        const subscription = await PartnerSubscription.getActiveSubscription(slot.partner_id);
        if (subscription && subscription.max_appointments !== null && subscription.max_appointments !== undefined) {
          const currentMonthCount = await Appointment.countCurrentMonthAppointments(slot.partner_id);
          if (currentMonthCount >= subscription.max_appointments) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
              error: `Therapist has reached maximum appointments limit` 
            });
          }
        }

        const startDatetime = new Date(slot.start_datetime);
        const endDatetime = new Date(slot.end_datetime);

        const dateUtils = require('../utils/dateUtils');
        const durationMinutes = dateUtils.differenceInMinutes(endDatetime, startDatetime);

        const appointmentTitle = `Therapy Session - ${slot.location_type === 'online' ? 'Online' : 'In-Person'}`;
        const appointmentData = {
          partner_id: slot.partner_id,
          user_id: userId,
          title: appointmentTitle,
          appointment_date: startDatetime.toISOString(),
          end_date: endDatetime.toISOString(),
          duration_minutes: durationMinutes,
          notes: `Booked via public profile - availability slot #${slot_id}`,
          timezone: 'UTC'
        };
        
        // Create appointment using raw query within transaction
        const appointmentQuery = `
          INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes, timezone)
          VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8)
          RETURNING *
        `;
        const appointmentValues = [
          appointmentData.partner_id,
          appointmentData.user_id,
          appointmentData.title,
          appointmentData.appointment_date,
          appointmentData.end_date,
          appointmentData.duration_minutes,
          appointmentData.notes,
          appointmentData.timezone
        ];
        const appointmentResult = await client.query(appointmentQuery, appointmentValues);
        const appointment = appointmentResult.rows[0];
        appointmentId = appointment.id;

        // Sync to Google Calendar (non-blocking)
        try {
          await googleCalendarService.syncAppointmentToGoogle(appointment.id);
        } catch (gcalError) {
          console.error('Google Calendar sync failed:', gcalError.message);
        }
      } catch (appointmentError) {
        console.error('Appointment creation error:', appointmentError);
        await client.query('ROLLBACK');
        return res.status(500).json({
          error: 'Failed to create appointment',
          details: appointmentError.message
        });
      }
    } else {
      googleConflict = true;
    }

    // Get partner fee settings - for public bookings, full session fee is collected
    const partner = await Partner.findById(slot.partner_id);
    const sessionFee = partner ? (parseFloat(partner.session_fee) || 0) : 0;
    
    // Since full session fee is collected upfront, status is 'confirmed'
    const bookingStatus = sessionFee > 0 ? 'confirmed' : 'booked';

    // Update slot with booking
    const updateQuery = `
      UPDATE availability_slots
      SET status = $4,
          is_available = FALSE,
          booked_by_user_id = $1,
          booked_at = CURRENT_TIMESTAMP,
          appointment_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [userId, appointmentId, slot_id, bookingStatus]);
    const bookedSlot = updateResult.rows[0];

    await client.query('COMMIT');

    // Send WhatsApp notifications (non-blocking) - after transaction commits
    if (appointmentId && !googleConflict) {
      // Get duration for notification
      const startDatetime = new Date(slot.start_datetime);
      const endDatetime = new Date(slot.end_datetime);
      const dateUtils = require('../utils/dateUtils');
      const durationMinutes = dateUtils.differenceInMinutes(endDatetime, startDatetime);
      
      // Async notification - don't await to avoid blocking response
      setImmediate(async () => {
        try {
          const user = await User.findById(userId);
          const partner = await Partner.findById(slot.partner_id);
          
          const partnerHasWhatsApp = await checkPartnerWhatsAppAccess(slot.partner_id);
          if (!partnerHasWhatsApp) {
            console.log(`[WhatsApp] WhatsApp not enabled for partner ${slot.partner_id}`);
          } else {
            let organizationHasWhatsApp = true;
            if (partner && partner.organization_id) {
              organizationHasWhatsApp = await checkOrganizationWhatsAppAccess(partner.organization_id);
            }

            if (partnerHasWhatsApp && organizationHasWhatsApp) {
              // Send notification to client using WhatsApp number if available, otherwise contact
              const clientContact = user.whatsapp_number || user.contact;
              if (clientContact) {
                await whatsappService.sendBookingConfirmation({
                  to: clientContact,
                  userName: user.name,
                  therapistName: partner.name,
                  appointmentDate: new Date(slot.start_datetime),
                  appointmentDuration: durationMinutes || 60,
                  isOnline: slot.location_type === 'online'
                });
              }
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          // Don't fail booking if WhatsApp fails
        }
      });
    }

    res.json({
      message: 'Booking confirmed successfully',
      booking: {
        slot_id: bookedSlot.id,
        appointment_id: appointmentId,
        user_id: userId,
        status: bookingStatus,
        google_conflict: googleConflict,
        is_existing_user: isExistingUser
      }
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Public booking error:', error);
    res.status(500).json({
      error: 'Failed to complete booking',
      details: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createSlot,
  getPartnerSlots,
  getClientSlots,
  updateSlot,
  deleteSlot,
  publishSlots,
  bookSlot,
  cancelBooking,
  getPaymentInfo,
  getPublicSlotsByPartnerId,
  bookSlotPublic
};
