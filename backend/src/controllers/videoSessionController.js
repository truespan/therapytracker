const VideoSession = require('../models/VideoSession');
const googleCalendarService = require('../services/googleCalendarService');

const createVideoSession = async (req, res) => {
  try {
    const {
      partner_id,
      user_id,
      title,
      session_date,
      end_date,
      duration_minutes,
      password_enabled,
      notes,
      timezone,
      therapy_session_id
    } = req.body;

    if (!partner_id || !user_id || !title || !session_date || !end_date) {
      return res.status(400).json({
        error: 'partner_id, user_id, title, session_date, and end_date are required'
      });
    }

    // Check for conflicts
    const hasConflict = await VideoSession.checkConflict(partner_id, session_date, end_date);
    if (hasConflict) {
      return res.status(409).json({
        error: 'Time slot conflicts with existing video session'
      });
    }

    // Check if partner has Google Calendar connected (required for Meet links)
    const GoogleCalendarToken = require('../models/GoogleCalendarToken');
    const tokenRecord = await GoogleCalendarToken.findByUser('partner', partner_id);
    
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      return res.status(400).json({
        error: 'google_calendar_not_connected',
        message: 'Google Calendar connection required to create video sessions with Meet links',
        details: 'Please connect your Google Calendar in Settings > Calendar Integration to enable video sessions with automatic Google Meet links.',
        action: 'connect_google_calendar',
        help_url: '/settings/calendar'
      });
    }

    // Generate meeting room ID first
    const meeting_room_id = VideoSession.generateMeetingRoomId(partner_id, user_id);

    const newSession = await VideoSession.create({
      partner_id,
      user_id,
      title,
      session_date,
      end_date,
      duration_minutes,
      password_enabled,
      notes,
      timezone,
      therapy_session_id
    });

    // If this video session is linked to a therapy session, update the therapy session
    if (therapy_session_id) {
      const TherapySession = require('../models/TherapySession');
      await TherapySession.update(therapy_session_id, {
        video_session_id: newSession.id
      });
    }

    // Sync to Google Calendar (non-blocking)
    try {
      await googleCalendarService.syncVideoSessionToGoogle(newSession.id);
    } catch (error) {
      console.error('Google Calendar sync failed:', error.message);
      // Don't fail the video session creation if sync fails
    }

    res.status(201).json({
      message: 'Video session created successfully',
      session: newSession
    });
  } catch (error) {
    console.error('Create video session error:', error);
    res.status(500).json({
      error: 'Failed to create video session',
      details: error.message
    });
  }
};

const getVideoSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    let session = await VideoSession.findById(id);

    if (!session) {
      return res.status(404).json({ error: 'Video session not found' });
    }

    // Don't send password hash to client
    const { password, ...sessionData } = session;

    res.json({ session: sessionData });
  } catch (error) {
    console.error('Get video session error:', error);
    res.status(500).json({
      error: 'Failed to fetch video session',
      details: error.message
    });
  }
};

const getPartnerVideoSessions = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    const sessions = await VideoSession.findByPartner(partnerId, start_date, end_date);
    
    // Remove password hashes from response
    const sanitizedSessions = sessions.map(({ password, ...session }) => session);

    res.json({ sessions: sanitizedSessions });
  } catch (error) {
    console.error('Get partner video sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video sessions', 
      details: error.message 
    });
  }
};

const getUserVideoSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await VideoSession.findByUser(userId);
    
    // Remove password hashes from response
    const sanitizedSessions = sessions.map(({ password, ...session }) => session);

    res.json({ sessions: sanitizedSessions });
  } catch (error) {
    console.error('Get user video sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video sessions', 
      details: error.message 
    });
  }
};

const updateVideoSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      session_date,
      end_date,
      duration_minutes,
      status,
      notes,
      password_enabled,
      partner_id,
      timezone
    } = req.body;

    const session = await VideoSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Video session not found' });
    }

    // Check for conflicts if dates are being updated
    if (session_date && end_date && partner_id) {
      const hasConflict = await VideoSession.checkConflict(
        partner_id,
        session_date,
        end_date,
        id
      );
      if (hasConflict) {
        return res.status(409).json({
          error: 'Time slot conflicts with existing video session'
        });
      }
    }

    const updatedSession = await VideoSession.update(id, {
      title,
      session_date,
      end_date,
      duration_minutes,
      status,
      notes,
      password_enabled,
      timezone
    });

    // Sync update to Google Calendar (non-blocking)
    try {
      await googleCalendarService.syncVideoSessionToGoogle(id);
    } catch (error) {
      console.error('Google Calendar sync failed:', error.message);
      // Don't fail the video session update if sync fails
    }

    // Don't send password hash to client
    const { password, ...sessionData } = updatedSession;

    res.json({
      message: 'Video session updated successfully',
      session: sessionData
    });
  } catch (error) {
    console.error('Update video session error:', error);
    res.status(500).json({
      error: 'Failed to update video session',
      details: error.message
    });
  }
};

const deleteVideoSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await VideoSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Video session not found' });
    }

    // Check if therapy session exists for this video session
    const TherapySession = require('../models/TherapySession');
    const therapySessions = await TherapySession.findByPartnerAndUser(
      session.partner_id,
      session.user_id
    );
    const hasTherapySession = therapySessions.some(
      ts => ts.video_session_id === parseInt(id)
    );

    if (hasTherapySession) {
      return res.status(409).json({
        error: 'Cannot delete video session. A therapy session has already been created for this video session.'
      });
    }

    // Delete from Google Calendar (non-blocking)
    try {
      await googleCalendarService.deleteVideoSessionFromGoogle(id);
    } catch (error) {
      console.error('Google Calendar delete failed:', error.message);
      // Continue with deletion even if Google sync fails
    }

    await VideoSession.delete(id);

    res.json({ message: 'Video session deleted successfully' });
  } catch (error) {
    console.error('Delete video session error:', error);
    res.status(500).json({
      error: 'Failed to delete video session',
      details: error.message
    });
  }
};

const verifySessionPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const session = await VideoSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Video session not found' });
    }

    if (!session.password_enabled) {
      return res.json({ verified: true, message: 'No password required' });
    }

    const isValid = await VideoSession.verifyPassword(password, session.password);
    
    if (isValid) {
      res.json({ verified: true, message: 'Password verified successfully' });
    } else {
      res.status(401).json({ verified: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Verify session password error:', error);
    res.status(500).json({ 
      error: 'Failed to verify password', 
      details: error.message 
    });
  }
};

module.exports = {
  createVideoSession,
  getVideoSessionById,
  getPartnerVideoSessions,
  getUserVideoSessions,
  updateVideoSession,
  deleteVideoSession,
  verifySessionPassword
};

