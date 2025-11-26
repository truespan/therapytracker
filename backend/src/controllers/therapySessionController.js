const TherapySession = require('../models/TherapySession');
const Appointment = require('../models/Appointment');

// Create a therapy session from an appointment
const createTherapySession = async (req, res) => {
  try {
    const {
      appointment_id,
      partner_id,
      user_id,
      session_title,
      session_notes,
      payment_notes
    } = req.body;

    // Validation
    if (!appointment_id || !partner_id || !user_id || !session_title) {
      return res.status(400).json({
        error: 'appointment_id, partner_id, user_id, and session_title are required'
      });
    }

    // Check if appointment exists and belongs to partner
    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (appointment.partner_id !== parseInt(partner_id)) {
      return res.status(403).json({ error: 'Appointment does not belong to this partner' });
    }
    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'A session has already been created for this appointment'
      });
    }

    // Check if session already exists for this appointment
    const existingSession = await TherapySession.findByAppointmentId(appointment_id);
    if (existingSession) {
      return res.status(409).json({
        error: 'A session has already been created for this appointment'
      });
    }

    // Create the therapy session with date from appointment
    const newSession = await TherapySession.create({
      appointment_id,
      partner_id,
      user_id,
      session_title,
      session_date: appointment.appointment_date,
      session_duration: appointment.duration_minutes,
      session_notes,
      payment_notes
    });

    // Update appointment status to completed
    await Appointment.update(appointment_id, { status: 'completed' });

    res.status(201).json({
      message: 'Therapy session created successfully',
      session: newSession
    });
  } catch (error) {
    console.error('Create therapy session error:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A session has already been created for this appointment'
      });
    }

    res.status(500).json({
      error: 'Failed to create therapy session',
      details: error.message
    });
  }
};

// Get session by ID
const getTherapySessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await TherapySession.findById(id);

    if (!session) {
      return res.status(404).json({ error: 'Therapy session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get therapy session error:', error);
    res.status(500).json({
      error: 'Failed to fetch therapy session',
      details: error.message
    });
  }
};

// Get all sessions for a partner
const getPartnerTherapySessions = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    const sessions = await TherapySession.findByPartner(partnerId, start_date, end_date);
    res.json({ sessions });
  } catch (error) {
    console.error('Get partner therapy sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch therapy sessions',
      details: error.message
    });
  }
};

// Get all sessions for a user
const getUserTherapySessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await TherapySession.findByUser(userId);
    res.json({ sessions });
  } catch (error) {
    console.error('Get user therapy sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch therapy sessions',
      details: error.message
    });
  }
};

// Update a therapy session
const updateTherapySession = async (req, res) => {
  try {
    const { id } = req.params;
    const { session_title, session_date, session_duration, session_notes, payment_notes } = req.body;

    const session = await TherapySession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Therapy session not found' });
    }

    const updatedSession = await TherapySession.update(id, {
      session_title,
      session_date,
      session_duration,
      session_notes,
      payment_notes
    });

    res.json({
      message: 'Therapy session updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Update therapy session error:', error);
    res.status(500).json({
      error: 'Failed to update therapy session',
      details: error.message
    });
  }
};

// Delete a therapy session
const deleteTherapySession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await TherapySession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Therapy session not found' });
    }

    // Optionally revert appointment status if session was from appointment
    if (session.appointment_id) {
      await Appointment.update(session.appointment_id, { status: 'scheduled' });
    }
    await TherapySession.delete(id);

    res.json({ message: 'Therapy session deleted successfully' });
  } catch (error) {
    console.error('Delete therapy session error:', error);
    res.status(500).json({
      error: 'Failed to delete therapy session',
      details: error.message
    });
  }
};

// Create standalone session (without appointment)
const createStandaloneSession = async (req, res) => {
  try {
    const { partner_id, user_id, session_title, session_date, session_duration, session_notes, payment_notes, video_session_id } = req.body;

    if (!partner_id || !user_id || !session_title || !session_date) {
      return res.status(400).json({
        error: 'partner_id, user_id, session_title, and session_date are required'
      });
    }

    const newSession = await TherapySession.createStandalone({
      partner_id,
      user_id,
      session_title,
      session_date,
      session_duration,
      session_notes,
      payment_notes,
      video_session_id
    });

    res.status(201).json({
      message: 'Therapy session created successfully',
      session: newSession
    });
  } catch (error) {
    console.error('Create standalone session error:', error);
    res.status(500).json({
      error: 'Failed to create therapy session',
      details: error.message
    });
  }
};

// Get sessions for specific partner-user pair
const getPartnerUserSessions = async (req, res) => {
  try {
    const { partnerId, userId } = req.params;
    const sessions = await TherapySession.findByPartnerAndUser(partnerId, userId);
    console.log('Sessions with questionnaires:', JSON.stringify(sessions, null, 2));
    res.json({ sessions });
  } catch (error) {
    console.error('Get partner user sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      details: error.message
    });
  }
};

// Assign questionnaire to session
const assignQuestionnaireToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionnaire_id, user_id, partner_id } = req.body;

    if (!questionnaire_id || !user_id || !partner_id) {
      return res.status(400).json({
        error: 'questionnaire_id, user_id, and partner_id are required'
      });
    }

    // Create user questionnaire assignment
    const QuestionnaireAssignment = require('../models/QuestionnaireAssignment');
    const assignmentId = await QuestionnaireAssignment.assignToUser(
      questionnaire_id,
      user_id,
      partner_id
    );

    // Link assignment to session
    await TherapySession.assignQuestionnaire(sessionId, assignmentId);

    res.status(201).json({
      message: 'Questionnaire assigned to session successfully',
      assignmentId
    });
  } catch (error) {
    console.error('Assign questionnaire to session error:', error);
    res.status(500).json({
      error: 'Failed to assign questionnaire',
      details: error.message
    });
  }
};

// Get questionnaires for session
const getSessionQuestionnaires = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const questionnaires = await TherapySession.getSessionQuestionnaires(sessionId);
    res.json({ questionnaires });
  } catch (error) {
    console.error('Get session questionnaires error:', error);
    res.status(500).json({
      error: 'Failed to fetch questionnaires',
      details: error.message
    });
  }
};

// Remove questionnaire from session
const removeQuestionnaireFromSession = async (req, res) => {
  try {
    const { sessionId, assignmentId } = req.params;
    await TherapySession.removeQuestionnaireAssignment(sessionId, assignmentId);
    res.json({ message: 'Questionnaire removed from session successfully' });
  } catch (error) {
    console.error('Remove questionnaire from session error:', error);
    res.status(500).json({
      error: 'Failed to remove questionnaire',
      details: error.message
    });
  }
};

module.exports = {
  createTherapySession,
  createStandaloneSession,
  getTherapySessionById,
  getPartnerTherapySessions,
  getPartnerUserSessions,
  getUserTherapySessions,
  updateTherapySession,
  deleteTherapySession,
  assignQuestionnaireToSession,
  getSessionQuestionnaires,
  removeQuestionnaireFromSession
};
