const User = require('../models/User');
const Auth = require('../models/Auth');

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the user's partners to check organization video sessions access
    const partners = await User.getPartners(id);
    let videoSessionsEnabled = false;

    if (partners && partners.length > 0) {
      // Check if any of the user's partners have organizations with video sessions enabled
      const db = require('../config/database');
      const orgCheck = await db.query(`
        SELECT DISTINCT o.video_sessions_enabled
        FROM partners p
        JOIN organizations o ON p.organization_id = o.id
        JOIN user_partner_assignments upa ON p.id = upa.partner_id
        WHERE upa.user_id = $1
        LIMIT 1
      `, [id]);

      if (orgCheck.rows.length > 0) {
        videoSessionsEnabled = orgCheck.rows[0].video_sessions_enabled || false;
      }
    }

    res.json({
      user,
      videoSessionsEnabled
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = require('../config/database');

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check authorization
    const isSelf = req.user.userType === 'user' && req.user.id === parseInt(id);
    const isAdmin = req.user.userType === 'admin';
    let isPartner = false;
    
    // Check if the current user is a partner and the target user is their client
    if (req.user.userType === 'partner') {
      const assignmentCheck = await db.query(
        'SELECT 1 FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
        [id, req.user.id]
      );
      isPartner = assignmentCheck.rows.length > 0;
    }

    if (!isSelf && !isAdmin && !isPartner) {
      return res.status(403).json({ error: 'Unauthorized to update this user' });
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          error: 'Please provide a valid email address'
        });
      }
    }

    // Validate contact number format if provided
    if (updates.contact) {
      const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
      if (!phoneRegex.test(updates.contact)) {
        return res.status(400).json({
          error: 'Please provide a valid contact number with country code (e.g., +919876543210)'
        });
      }
    }

    // If email is being updated, also update auth_credentials
    if (updates.email && updates.email !== user.email) {
      // Check if the new email is already in use by another user
      const existingAuth = await Auth.findByEmail(updates.email);
      if (existingAuth && existingAuth.reference_id !== parseInt(id)) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }

      // Update email in auth_credentials
      await db.query(
        'UPDATE auth_credentials SET email = $1 WHERE user_type = $2 AND reference_id = $3',
        [updates.email, 'user', id]
      );
      console.log(`[USER UPDATE] Updated auth_credentials email for user ${id} to ${updates.email}`);
    }

    const updatedUser = await User.update(id, updates);
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data
    // Note: The old profile_fields system has been removed
    // Use questionnaires for assessments instead
    res.json({
      user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

const getUserPartners = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const partners = await User.getPartners(id);
    res.json({ partners });
  } catch (error) {
    console.error('Get user partners error:', error);
    res.status(500).json({ error: 'Failed to fetch user partners', details: error.message });
  }
};

const assignUserToPartner = async (req, res) => {
  try {
    const { userId, partnerId } = req.body;

    if (!userId || !partnerId) {
      return res.status(400).json({ error: 'userId and partnerId are required' });
    }

    const assignment = await User.assignToPartner(userId, partnerId);
    res.status(201).json({ 
      message: 'User assigned to partner successfully',
      assignment 
    });
  } catch (error) {
    console.error('Assign user to partner error:', error);
    res.status(500).json({ error: 'Failed to assign user to partner', details: error.message });
  }
};

module.exports = {
  getUserById,
  updateUser,
  getUserProfile,
  getUserPartners,
  assignUserToPartner
};

