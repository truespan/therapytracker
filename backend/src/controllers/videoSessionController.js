const VideoSession = require('../models/VideoSession');
const googleCalendarService = require('../services/googleCalendarService');
const dailyService = require('../services/dailyService');
const { calculateRoomExpiration } = require('../utils/dailyConfig');

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
      timezone
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

    // Generate meeting room ID first
    const meeting_room_id = VideoSession.generateMeetingRoomId(partner_id, user_id);

    // Create Daily.co room
    let daily_room_url = null;
    try {
      const expirationTime = calculateRoomExpiration(session_date, duration_minutes || 60);
      const dailyRoom = await dailyService.createDailyRoom({
        name: meeting_room_id,
        expirationTime,
        maxParticipants: 2
      });
      daily_room_url = dailyRoom.url;
      console.log(`Daily.co room created for session: ${daily_room_url}`);
    } catch (error) {
      console.error('Failed to create Daily.co room:', error.message);
      // Continue without Daily.co URL if creation fails
      // The session will still be created with meeting_room_id
    }

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
      daily_room_url
    });

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

    // Lazy migration: Create Daily.co room for existing sessions without daily_room_url
    if (!session.daily_room_url && session.status === 'scheduled' && session.meeting_room_id) {
      try {
        const expirationTime = calculateRoomExpiration(session.session_date, session.duration_minutes);
        const dailyRoom = await dailyService.createDailyRoom({
          name: session.meeting_room_id,
          expirationTime,
          maxParticipants: 2
        });

        // Update session with Daily.co URL
        await VideoSession.update(id, { daily_room_url: dailyRoom.url });
        session.daily_room_url = dailyRoom.url;

        console.log(`Lazy migration: Created Daily.co room for session ${id}`);
      } catch (error) {
        console.error('Failed to create Daily.co room during lazy migration:', error.message);
        // Continue without Daily.co URL
      }
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

    // Delete Daily.co room (non-blocking)
    if (session.meeting_room_id) {
      try {
        await dailyService.deleteDailyRoom(session.meeting_room_id);
        console.log(`Daily.co room deleted: ${session.meeting_room_id}`);
      } catch (error) {
        console.error('Daily.co room deletion failed:', error.message);
        // Continue with session deletion even if Daily.co cleanup fails
      }
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

