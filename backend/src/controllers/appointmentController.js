const Appointment = require('../models/Appointment');

const createAppointment = async (req, res) => {
  try {
    const { partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes } = req.body;

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
      notes
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
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
    const { title, appointment_date, end_date, duration_minutes, status, notes, partner_id } = req.body;

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
      notes
    });

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
    res.status(500).json({
      error: 'Failed to fetch upcoming appointments',
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
  getUpcomingAppointments
};

