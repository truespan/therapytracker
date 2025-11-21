const Session = require('../models/Session');
const Profile = require('../models/Profile');
const User = require('../models/User');

const createSession = async (req, res) => {
  try {
    const { user_id, partner_id, session_date } = req.body;

    if (!user_id || !partner_id) {
      return res.status(400).json({ error: 'user_id and partner_id are required' });
    }

    // Check if user already has an incomplete session
    const incompleteSession = await Session.findIncompleteSessionByUser(user_id);
    if (incompleteSession) {
      return res.status(400).json({ 
        error: `User already has an incomplete session (Session ${incompleteSession.session_number}). Please complete it before creating a new session.` 
      });
    }

    // Get next session number
    const session_number = await Session.getNextSessionNumber(user_id);

    const newSession = await Session.create({
      user_id,
      partner_id,
      session_number,
      session_date: session_date || new Date(),
      completed: false
    });

    res.status(201).json({
      message: 'Session created successfully',
      session: newSession
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get profile data for this session if it exists
    const profileData = await Profile.getUserProfileBySession(session.user_id, id);

    res.json({ 
      session,
      profileData 
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessions = await Session.findByUser(userId);
    res.json({ sessions });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions', details: error.message });
  }
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback_text, rating, completed, main_issue } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updatedSession = await Session.update(id, {
      feedback_text,
      rating,
      completed,
      main_issue
    });

    res.json({
      message: 'Session updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await Session.delete(id);

    res.json({
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session', details: error.message });
  }
};

const saveSessionProfile = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { ratings } = req.body; // Array of { field_id, rating_value }

    if (!ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ error: 'ratings array is required' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save all ratings
    const savedRatings = [];
    for (const rating of ratings) {
      const saved = await Profile.saveUserProfile({
        user_id: session.user_id,
        session_id: sessionId,
        field_id: rating.field_id,
        rating_value: rating.rating_value
      });
      savedRatings.push(saved);
    }

    // Mark session as completed
    await Session.update(sessionId, { completed: true });

    res.status(201).json({
      message: 'Session profile saved successfully',
      ratings: savedRatings
    });
  } catch (error) {
    console.error('Save session profile error:', error);
    res.status(500).json({ error: 'Failed to save session profile', details: error.message });
  }
};

module.exports = {
  createSession,
  getSessionById,
  getUserSessions,
  updateSession,
  deleteSession,
  saveSessionProfile
};

