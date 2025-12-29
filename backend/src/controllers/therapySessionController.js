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
      payment_notes,
      session_date
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

    // Use override session_date if provided, otherwise use appointment date
    const effectiveSessionDate = session_date || appointment.appointment_date;

    // Create the therapy session with date from appointment or override
    const newSession = await TherapySession.create({
      appointment_id,
      partner_id,
      user_id,
      session_title,
      session_date: effectiveSessionDate,
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
    let { session_title, session_date, session_duration, session_notes, payment_notes, status } = req.body;

    // Validate session note length if provided
    if (session_notes !== undefined && session_notes !== null) {
      if (typeof session_notes === 'string') {
        const trimmedNote = session_notes.trim();

        if (trimmedNote.length > 10000) {
          return res.status(400).json({
            error: 'Session note cannot exceed 10,000 characters'
          });
        }

        // Normalize empty strings to null
        session_notes = trimmedNote.length === 0 ? null : trimmedNote;
      } else {
        // If it's not a string and not null, set to null
        session_notes = null;
      }
    }

    const session = await TherapySession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Therapy session not found' });
    }

    const updatedSession = await TherapySession.update(id, {
      session_title,
      session_date,
      session_duration,
      session_notes,
      payment_notes,
      status
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

// Delete a therapy session - DISABLED
// Therapy sessions cannot be deleted to maintain historical records and data integrity
const deleteTherapySession = async (req, res) => {
  return res.status(403).json({
    error: 'Therapy sessions cannot be deleted',
    message: 'Therapy sessions are permanent records and cannot be deleted to maintain historical data integrity. This includes sessions created from appointments and video sessions.'
  });
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

// Create therapy session automatically from video session
const createSessionFromVideoSession = async (req, res) => {
  try {
    const { videoSessionId } = req.params;
    const VideoSession = require('../models/VideoSession');

    // Get video session details
    const videoSession = await VideoSession.findById(videoSessionId);
    if (!videoSession) {
      return res.status(404).json({ error: 'Video session not found' });
    }

    // Check if therapy session already exists for this video session
    const db = require('../config/database');
    const checkQuery = 'SELECT id FROM therapy_sessions WHERE video_session_id = $1';
    const checkResult = await db.query(checkQuery, [videoSessionId]);
    const sessionExists = checkResult.rows.length > 0;

    if (sessionExists) {
      return res.status(409).json({
        error: 'A therapy session has already been created for this video session'
      });
    }

    // Update video session status to 'in_progress'
    await VideoSession.updateStatus(videoSessionId, 'in_progress');

    // Create therapy session with video session details
    const newSession = await TherapySession.createStandalone({
      partner_id: videoSession.partner_id,
      user_id: videoSession.user_id,
      session_title: videoSession.title,
      session_date: videoSession.session_date,
      session_duration: videoSession.duration_minutes,
      session_notes: null,
      payment_notes: null,
      video_session_id: videoSessionId
    });

    res.status(201).json({
      message: 'Therapy session created successfully from video session',
      session: newSession
    });
  } catch (error) {
    console.error('Create session from video session error:', error);
    res.status(500).json({
      error: 'Failed to create therapy session from video session',
      details: error.message
    });
  }
};

// Check and auto-complete video sessions that ended more than 24 hours ago
const checkAutoCompleteSessions = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const VideoSession = require('../models/VideoSession');
    const db = require('../config/database');
    
    // Find video sessions that:
    // 1. Belong to this partner
    // 2. Ended more than 2 hours ago
    // 3. Don't have a therapy session
    // 4. Are not cancelled
    const query = `
      SELECT vs.*
      FROM video_sessions vs
      LEFT JOIN therapy_sessions ts ON vs.id = ts.video_session_id
      WHERE vs.partner_id = $1
        AND ts.id IS NULL
        AND vs.end_date < CURRENT_TIMESTAMP - INTERVAL '2 hours'
        AND vs.status != 'cancelled'
        AND vs.status IN ('scheduled', 'in_progress', 'completed')
      ORDER BY vs.end_date DESC
      LIMIT 10
    `;
    
    const result = await db.query(query, [partnerId]);
    const sessionsToComplete = result.rows;
    const autoCompletedSessions = [];
    
    // Auto-complete each session
    for (const videoSession of sessionsToComplete) {
      try {
        // Create therapy session with auto-completion note
        const newSession = await TherapySession.createStandalone({
          partner_id: videoSession.partner_id,
          user_id: videoSession.user_id,
          session_title: videoSession.title,
          session_date: videoSession.session_date,
          session_duration: videoSession.duration_minutes,
          session_notes: 'Auto-completed: Therapist did not manually complete this session within 2 hours.',
          payment_notes: null,
          video_session_id: videoSession.id
        });
        
        // Mark video session as completed
        await VideoSession.updateStatus(videoSession.id, 'completed');
        
        autoCompletedSessions.push({
          id: videoSession.id,
          title: videoSession.title,
          session_date: videoSession.session_date,
          therapy_session_id: newSession.id
        });
      } catch (error) {
        console.error(`Failed to auto-complete session ${videoSession.id}:`, error);
        // Continue with other sessions even if one fails
      }
    }
    
    res.json({
      message: `Auto-completed ${autoCompletedSessions.length} session(s)`,
      autoCompletedSessions
    });
  } catch (error) {
    console.error('Check auto-complete sessions error:', error);
    res.status(500).json({
      error: 'Failed to check auto-complete sessions',
      details: error.message
    });
  }
};

module.exports = {
  createTherapySession,
  createStandaloneSession,
  createSessionFromVideoSession,
  getTherapySessionById,
  getPartnerTherapySessions,
  getPartnerUserSessions,
  getUserTherapySessions,
  updateTherapySession,
  deleteTherapySession,
  assignQuestionnaireToSession,
  getSessionQuestionnaires,
  removeQuestionnaireFromSession,
  checkAutoCompleteSessions
};
