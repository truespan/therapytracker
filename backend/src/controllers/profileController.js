const Profile = require('../models/Profile');
const Session = require('../models/Session');

const getAllFields = async (req, res) => {
  try {
    const sessionId = req.query.session_id ? parseInt(req.query.session_id) : null;
    const userId = req.user.userType === 'user' ? req.user.id : null;
    
    let fields;
    if (sessionId && userId) {
      // For users with session_id, use session-specific query
      fields = await Profile.getFieldsBySession(userId, sessionId);
      console.log(`[PROFILE FIELDS] Fetched ${fields.length} fields for user ${userId}, session ${sessionId}`);
    } else {
      // Fallback: return all fields (for backward compatibility or partners)
      fields = await Profile.getAllFields(sessionId, userId);
      console.log(`[PROFILE FIELDS] Fetched ${fields.length} fields (all fields)`);
    }
    
    res.json({ fields });
  } catch (error) {
    console.error('Get all fields error:', error);
    res.status(500).json({ error: 'Failed to fetch profile fields', details: error.message });
  }
};

const createCustomField = async (req, res) => {
  try {
    const { field_name, field_type, category, session_id } = req.body;

    if (!field_name || !field_type || !category) {
      return res.status(400).json({ 
        error: 'field_name, field_type, and category are required' 
      });
    }

    // For users, session_id is required for custom fields
    if (req.user.userType === 'user') {
      if (!session_id) {
        return res.status(400).json({ 
          error: 'session_id is required for user custom fields' 
        });
      }

      // Validate session exists and belongs to the user
      const session = await Session.findById(session_id);
      if (!session) {
        return res.status(404).json({ 
          error: 'Session not found' 
        });
      }

      if (session.user_id !== req.user.id) {
        return res.status(403).json({ 
          error: 'Session does not belong to this user' 
        });
      }

      // Check if session is completed (custom fields only for incomplete sessions)
      if (session.completed) {
        return res.status(400).json({ 
          error: 'Cannot add custom fields to completed sessions' 
        });
      }
    }

    // Determine who is creating the field
    let created_by_user_id = null;
    let created_by_partner_id = null;
    let user_id = null;
    let session_id_for_field = null;

    if (req.user.userType === 'user') {
      created_by_user_id = req.user.id;
      user_id = req.user.id;
      session_id_for_field = session_id;
    } else if (req.user.userType === 'partner') {
      created_by_partner_id = req.user.id;
      // Partners can create fields without session_id (global custom fields)
      // But if session_id is provided, use it
      if (session_id) {
        session_id_for_field = session_id;
      }
    }

    const newField = await Profile.createField({
      field_name,
      field_type,
      category,
      is_default: false,
      created_by_user_id,
      created_by_partner_id,
      user_id,
      session_id: session_id_for_field
    });

    res.status(201).json({
      message: 'Custom field created successfully',
      field: newField
    });
  } catch (error) {
    console.error('Create custom field error:', error);
    res.status(500).json({ error: 'Failed to create custom field', details: error.message });
  }
};

const getUserProfileData = async (req, res) => {
  try {
    const { userId } = req.params;

    const latestProfile = await Profile.getUserLatestProfile(userId);
    const allProfiles = await Profile.getAllUserProfiles(userId);

    res.json({
      latestProfile,
      allProfiles
    });
  } catch (error) {
    console.error('Get user profile data error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile data', details: error.message });
  }
};

module.exports = {
  getAllFields,
  createCustomField,
  getUserProfileData
};

