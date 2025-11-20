const Organization = require('../models/Organization');
const Partner = require('../models/Partner');

const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.getAll();
    res.json({ organizations });
  } catch (error) {
    console.error('Get all organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations', details: error.message });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization', details: error.message });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this organization' });
    }

    const updatedOrganization = await Organization.update(id, updates);
    res.json({ 
      message: 'Organization updated successfully',
      organization: updatedOrganization 
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization', details: error.message });
  }
};

const getOrganizationPartners = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this organization\'s partners' });
    }

    const partners = await Organization.getPartners(id);
    res.json({ partners });
  } catch (error) {
    console.error('Get organization partners error:', error);
    res.status(500).json({ error: 'Failed to fetch organization partners', details: error.message });
  }
};

const getOrganizationUsers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this organization\'s users' });
    }

    const users = await Organization.getAllUsers(id);
    res.json({ users });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch organization users', details: error.message });
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationPartners,
  getOrganizationUsers
};

