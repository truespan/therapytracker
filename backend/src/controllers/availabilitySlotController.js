const AvailabilitySlot = require('../models/AvailabilitySlot');
const Appointment = require('../models/Appointment');
const googleCalendarService = require('../services/googleCalendarService');
const db = require('../config/database');

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

    // Validate start_time < end_time
    if (start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be before end_time'
      });
    }

    // Check for Google Calendar conflicts if creating an "available" slot
    let conflictWarning = null;
    if (status.startsWith('available')) {
      const start_datetime = `${slot_date} ${start_time}`;
      const end_datetime = `${slot_date} ${end_time}`;

      const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
        partner_id,
        start_datetime,
        end_datetime
      );

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
      status,
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

    // Default to next 7 days if not specified
    let startDate = start_date;
    let endDate = end_date;

    if (!startDate || !endDate) {
      const dateUtils = require('../utils/dateUtils');
      const today = dateUtils.getCurrentUTC();
      startDate = dateUtils.formatDate(today);

      const sevenDaysLater = dateUtils.addDays(today, 6);
      endDate = dateUtils.formatDate(sevenDaysLater);
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

    // Get next 7 days using dateUtils
    const dateUtils = require('../utils/dateUtils');
    const today = dateUtils.getCurrentUTC();
    const startDate = dateUtils.formatDate(today);

    const sevenDaysLater = dateUtils.addDays(today, 6);
    const endDate = dateUtils.formatDate(sevenDaysLater);

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

    // Prevent editing booked slots
    if (slot.status === 'booked') {
      return res.status(400).json({
        error: 'Cannot edit a booked slot. Please delete and create a new one instead.'
      });
    }

    // Validate start_time < end_time if both provided
    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be before end_time'
      });
    }

    // Re-check conflicts if becoming available
    let conflictWarning = null;
    if (status && status.startsWith('available')) {
      const checkDate = slot_date || slot.slot_date;
      const checkStartTime = start_time || slot.start_time;
      const checkEndTime = end_time || slot.end_time;

      const start_datetime = `${checkDate} ${checkStartTime}`;
      const end_datetime = `${checkDate} ${checkEndTime}`;

      const conflicts = await AvailabilitySlot.checkGoogleCalendarConflict(
        slot.partner_id,
        start_datetime,
        end_datetime
      );

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
      status
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

    // If slot is booked, delete the associated appointment first
    if (slot.status === 'booked' && slot.appointment_id) {
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
      message: slot.status === 'booked'
        ? 'Booked slot and associated appointment deleted successfully'
        : 'Slot deleted successfully',
      slot: archivedSlot,
      appointment_deleted: slot.status === 'booked'
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
    if (slot.status === 'booked') {
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
        // Create appointment using formatted date/time strings
        // Use the explicitly formatted fields to avoid any timezone issues
        const slotDate = slot.slot_date_formatted;
        const startTime = slot.start_time_formatted;
        const endTime = slot.end_time_formatted;

        // Calculate duration from time strings
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

        // Construct ISO datetime strings with explicit UTC timezone marker ('Z' suffix)
        // Availability slots are stored in UTC, so we must preserve that when creating appointments
        const startISO = `${slotDate}T${startTime}:00Z`;
        const endISO = `${slotDate}T${endTime}:00Z`;

        console.log('Booking slot - Date:', slotDate, 'Start:', startTime, 'End:', endTime);
        console.log('ISO Strings - Start:', startISO, 'End:', endISO);

        const appointmentTitle = `Therapy Session - ${slot.location_type === 'online' ? 'Online' : 'In-Person'}`;
        const appointment = await Appointment.create({
          partner_id: slot.partner_id,
          user_id: userId,
          title: appointmentTitle,
          appointment_date: startISO,
          end_date: endISO,
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

    // Update slot to booked status
    const updateQuery = `
      UPDATE availability_slots
      SET status = 'booked',
          is_available = FALSE,
          booked_by_user_id = $1,
          booked_at = CURRENT_TIMESTAMP,
          appointment_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [userId, appointmentId, id]);
    const bookedSlot = updateResult.rows[0];

    await client.query('COMMIT');

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

module.exports = {
  createSlot,
  getPartnerSlots,
  getClientSlots,
  updateSlot,
  deleteSlot,
  publishSlots,
  bookSlot
};
