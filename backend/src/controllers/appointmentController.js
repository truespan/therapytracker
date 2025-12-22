const Appointment = require('../models/Appointment');
const googleCalendarService = require('../services/googleCalendarService');
const whatsappService = require('../services/whatsappService');
const User = require('../models/User');
const Partner = require('../models/Partner');

const createAppointment = async (req, res) => {
  try {
    const { partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes, timezone } = req.body;

    if (!partner_id || !user_id || !title || !appointment_date || !end_date) {
      return res.status(400).json({ error: 'partner_id, user_id, title, appointment_date, and end_date are required' });
    }

    // Check for conflicts
    const hasConflict = await Appointment.checkConflict(partner_id, appointment_date, end_date);
    if (hasConflict) {
      return res.status(409).json({ error: 'Time slot conflicts with existing appointment' });
    }

    const newAppointment = await Appointment.create({
      partner_id,
      user_id,
      title,
      appointment_date,
      end_date,
      duration_minutes,
      notes,
      timezone
    });

    // Sync to Google Calendar (non-blocking)
    try {
      await googleCalendarService.syncAppointmentToGoogle(newAppointment.id);
    } catch (error) {
      console.error('Google Calendar sync failed:', error.message);
      // Don't fail the appointment creation if sync fails
    }

    // Send WhatsApp notifications (non-blocking)
    try {
      await sendWhatsAppNotifications(newAppointment.id, user_id, partner_id, title, appointment_date, end_date, duration_minutes, timezone);
    } catch (error) {
      console.error('WhatsApp notification failed:', error.message);
      // Don't fail the appointment creation if WhatsApp fails
    }

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
};

/**
 * Send WhatsApp notifications for appointment (both client and therapist)
 * @param {number} appointmentId - Appointment ID
 * @param {number} userId - User ID
 * @param {number} partnerId - Partner ID
 * @param {string} title - Appointment title
 * @param {string} appointmentDate - Appointment date
 * @param {string} endDate - End date
 * @param {number} durationMinutes - Duration in minutes
 * @param {string} timezone - Timezone
 */
const sendWhatsAppNotifications = async (appointmentId, userId, partnerId, title, appointmentDate, endDate, durationMinutes, timezone) => {
  try {
    // Get user details for phone number
    const user = await User.findById(userId);
    const partner = await Partner.findById(partnerId);
    
    if (!user) {
      console.log(`[WhatsApp] User not found for userId ${userId}`);
      return;
    }
    
    if (!partner) {
      console.log(`[WhatsApp] Partner not found for partnerId ${partnerId}`);
      return;
    }

    // Send notification to client
    if (user.contact) {
      const clientAppointmentData = {
        userName: user.name,
        therapistName: partner.name,
        appointmentDate: appointmentDate,
        appointmentTime: new Date(appointmentDate).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }),
        timezone: timezone || 'IST',
        appointmentType: title,
        duration: durationMinutes || 60
      };

      const clientResult = await whatsappService.sendAppointmentConfirmation(
        user.contact,
        clientAppointmentData,
        appointmentId,
        userId
      );

      if (clientResult.success) {
        console.log(`[WhatsApp] Client notification sent successfully for appointment ${appointmentId}`);
      } else {
        console.error(`[WhatsApp] Failed to send client notification for appointment ${appointmentId}:`, clientResult.error);
      }
    } else {
      console.log(`[WhatsApp] No phone number found for user ${userId}`);
    }

    // Send notification to therapist
    if (partner.contact) {
      const therapistAppointmentData = {
        therapistName: partner.name,
        clientName: user.name,
        appointmentDate: appointmentDate,
        appointmentTime: new Date(appointmentDate).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }),
        timezone: timezone || 'IST',
        appointmentType: title,
        duration: durationMinutes || 60,
        clientPhone: user.contact || 'Not provided',
        clientEmail: user.email || 'Not provided'
      };

      const therapistResult = await whatsappService.sendTherapistAppointmentNotification(
        partner.contact,
        therapistAppointmentData,
        appointmentId,
        partnerId
      );

      if (therapistResult.success) {
        console.log(`[WhatsApp] Therapist notification sent successfully for appointment ${appointmentId}`);
      } else {
        console.error(`[WhatsApp] Failed to send therapist notification for appointment ${appointmentId}:`, therapistResult.error);
      }
    } else {
      console.log(`[WhatsApp] No phone number found for partner ${partnerId}`);
    }
  } catch (error) {
    console.error(`[WhatsApp] Error sending notifications for appointment ${appointmentId}:`, error.message);
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment', details: error.message });
  }
};

const getPartnerAppointments = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    const appointments = await Appointment.findByPartner(partnerId, start_date, end_date);
    res.json({ appointments });
  } catch (error) {
    console.error('Get partner appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
};

const getUserAppointments = async (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.findByUser(userId);
    res.json({ appointments });
  } catch (error) {
    console.error('Get user appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, appointment_date, end_date, duration_minutes, status, notes, partner_id, timezone } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check for conflicts if dates are being updated
    if (appointment_date && end_date && partner_id) {
      const hasConflict = await Appointment.checkConflict(
        partner_id,
        appointment_date,
        end_date,
        id
      );
      if (hasConflict) {
        return res.status(409).json({ error: 'Time slot conflicts with existing appointment' });
      }
    }

    const updatedAppointment = await Appointment.update(id, {
      title,
      appointment_date,
      end_date,
      duration_minutes,
      status,
      notes,
      timezone
    });

    // Sync update to Google Calendar (non-blocking)
    try {
      await googleCalendarService.syncAppointmentToGoogle(id);
    } catch (error) {
      console.error('Google Calendar sync failed:', error.message);
      // Don't fail the appointment update if sync fails
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment', details: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Delete from Google Calendar first (non-blocking)
    try {
      await googleCalendarService.deleteAppointmentFromGoogle(id);
    } catch (error) {
      console.error('Google Calendar delete failed:', error.message);
      // Continue with deletion even if Google sync fails
    }

    await Appointment.delete(id);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment', details: error.message });
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { days } = req.query; // Optional: number of days to look ahead (default 7)

    const daysAhead = days ? parseInt(days) : 7;
    const appointments = await Appointment.findUpcomingByPartner(partnerId, daysAhead);

    res.json({ appointments });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments', details: error.message });
  }
};

const checkAppointmentConflicts = async (req, res) => {
  try {
    const { partner_id, appointment_date, end_date, exclude_id } = req.query;

    if (!partner_id || !appointment_date || !end_date) {
      return res.status(400).json({
        error: 'partner_id, appointment_date, and end_date are required'
      });
    }

    const conflicts = await Appointment.getConflictDetails(
      parseInt(partner_id),
      appointment_date,
      end_date,
      exclude_id ? parseInt(exclude_id) : null
    );

    res.json({
      hasConflict: conflicts.length > 0,
      conflicts: conflicts
    });
  } catch (error) {
    console.error('Check conflicts error:', error);
    res.status(500).json({
      error: 'Failed to check conflicts',
      details: error.message
    });
  }
};

module.exports = {
  createAppointment,
  getAppointmentById,
  getPartnerAppointments,
  getUserAppointments,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointments,
  checkAppointmentConflicts
};
