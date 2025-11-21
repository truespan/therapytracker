const User = require('../models/User');
const Profile = require('../models/Profile');

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check authorization
    if (req.user.userType === 'user' && req.user.id !== parseInt(id)) {
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

    // Get all profile history
    const profileHistory = await Profile.getUserProfileHistory(id);

    res.json({ 
      user,
      profileHistory 
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

