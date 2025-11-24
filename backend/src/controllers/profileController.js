const Profile = require('../models/Profile');

const getAllFields = async (req, res) => {
  try {
    const userId = req.user.userType === 'user' ? req.user.id : null;
    
    // Return all fields (sessions are deprecated)
    const fields = await Profile.getAllFields(null, userId);
    console.log(`[PROFILE FIELDS] Fetched ${fields.length} fields`);
    
    res.json({ fields });
  } catch (error) {
    console.error('Get all fields error:', error);
    res.status(500).json({ error: 'Failed to fetch profile fields', details: error.message });
  }
};

const createCustomField = async (req, res) => {
  try {
    const { field_name, field_type, category } = req.body;

    if (!field_name || !field_type || !category) {
      return res.status(400).json({ 
        error: 'field_name, field_type, and category are required' 
      });
    }

    // Determine who is creating the field
    let created_by_user_id = null;
    let created_by_partner_id = null;
    let user_id = null;

    if (req.user.userType === 'user') {
      created_by_user_id = req.user.id;
      user_id = req.user.id;
    } else if (req.user.userType === 'partner') {
      created_by_partner_id = req.user.id;
    }

    const newField = await Profile.createField({
      field_name,
      field_type,
      category,
      is_default: false,
      created_by_user_id,
      created_by_partner_id,
      user_id
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

