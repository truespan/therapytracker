const Partner = require('../models/Partner');
const User = require('../models/User');

const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({ partner });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ error: 'Failed to fetch partner', details: error.message });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this partner' });
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

    const updatedPartner = await Partner.update(id, updates);
    res.json({ 
      message: 'Partner updated successfully',
      partner: updatedPartner 
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({ error: 'Failed to update partner', details: error.message });
  }
};

const getPartnerUsers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this partner\'s users' });
    }

    const users = await Partner.getUsers(id);
    res.json({ users });
  } catch (error) {
    console.error('Get partner users error:', error);
    res.status(500).json({ error: 'Failed to fetch partner users', details: error.message });
  }
};

const getUserProfileForPartner = async (req, res) => {
  try {
    const { partnerId, userId } = req.params;

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(partnerId)) {
      return res.status(403).json({ error: 'Unauthorized to view this user\'s profile' });
    }

    // Verify user is assigned to this partner
    const users = await Partner.getUsers(partnerId);
    const isAssigned = users.some(u => u.id === parseInt(userId));

    if (!isAssigned) {
      return res.status(403).json({ error: 'User is not assigned to this partner' });
    }

    const user = await User.findById(userId);

    // Return user data
    // Note: The old profile_fields system has been removed
    // Use questionnaires for assessments instead
    res.json({
      user
    });
  } catch (error) {
    console.error('Get user profile for partner error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

module.exports = {
  getPartnerById,
  updatePartner,
  getPartnerUsers,
  getUserProfileForPartner
};

