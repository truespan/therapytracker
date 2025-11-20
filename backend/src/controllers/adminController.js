const bcrypt = require('bcrypt');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');
const Auth = require('../models/Auth');
const db = require('../config/database');

const SALT_ROUNDS = 10;

/**
 * Get all organizations with their metrics
 */
const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.getAllWithMetrics();
    res.json({ 
      success: true,
      organizations 
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organizations', 
      details: error.message 
    });
  }
};

/**
 * Create a new organization (admin only)
 */
const createOrganization = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      contact, 
      address, 
      gst_no, 
      subscription_plan, 
      password 
    } = req.body;

    // Validate required fields
    if (!name || !email || !contact || !password) {
      return res.status(400).json({ 
        error: 'Name, email, contact, and password are required' 
      });
    }

    // Validate subscription plan if provided
    if (subscription_plan && !['basic', 'silver', 'gold'].includes(subscription_plan)) {
      return res.status(400).json({ 
        error: 'Invalid subscription plan. Must be basic, silver, or gold' 
      });
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction to create organization and auth credentials
    const result = await db.transaction(async (client) => {
      // Create organization
      const newOrg = await Organization.create({
        name,
        date_of_creation: new Date(),
        email,
        contact,
        address: address || null,
        photo_url: null,
        gst_no: gst_no || null,
        subscription_plan: subscription_plan || null
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'organization',
        reference_id: newOrg.id,
        email,
        password_hash: passwordHash
      }, client);

      return newOrg;
    });

    console.log(`[ADMIN] Organization created: ${result.name} (ID: ${result.id})`);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization: result
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ 
      error: 'Failed to create organization', 
      details: error.message 
    });
  }
};

/**
 * Update organization details
 */
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate subscription plan if provided
    if (updateData.subscription_plan && 
        !['basic', 'silver', 'gold'].includes(updateData.subscription_plan)) {
      return res.status(400).json({ 
        error: 'Invalid subscription plan. Must be basic, silver, or gold' 
      });
    }

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // If email is being updated, check if it's already in use
    if (updateData.email && updateData.email !== org.email) {
      const existingAuth = await Auth.findByEmail(updateData.email);
      if (existingAuth) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Update email in auth_credentials too
      await db.query(
        'UPDATE auth_credentials SET email = $1 WHERE user_type = $2 AND reference_id = $3',
        [updateData.email, 'organization', id]
      );
    }

    // Update organization
    const updated = await Organization.update(id, updateData);

    console.log(`[ADMIN] Organization updated: ${updated.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: updated
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ 
      error: 'Failed to update organization', 
      details: error.message 
    });
  }
};

/**
 * Deactivate an organization
 */
const deactivateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id; // From JWT token

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!org.is_active) {
      return res.status(400).json({ error: 'Organization is already deactivated' });
    }

    // Deactivate organization
    const deactivated = await Organization.deactivate(id, adminId);

    console.log(`[ADMIN] Organization deactivated: ${deactivated.name} (ID: ${id}) by Admin ID: ${adminId}`);

    res.json({
      success: true,
      message: 'Organization deactivated successfully',
      organization: deactivated
    });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    res.status(500).json({ 
      error: 'Failed to deactivate organization', 
      details: error.message 
    });
  }
};

/**
 * Activate an organization
 */
const activateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org.is_active) {
      return res.status(400).json({ error: 'Organization is already active' });
    }

    // Activate organization
    const activated = await Organization.activate(id);

    console.log(`[ADMIN] Organization activated: ${activated.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization activated successfully',
      organization: activated
    });
  } catch (error) {
    console.error('Error activating organization:', error);
    res.status(500).json({ 
      error: 'Failed to activate organization', 
      details: error.message 
    });
  }
};

/**
 * Permanently delete an organization
 */
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Use transaction to delete organization and auth credentials
    await db.transaction(async (client) => {
      // Delete auth credentials
      await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2',
        ['organization', id]
      );

      // Delete organization (cascade will handle partners, users, etc.)
      await client.query('DELETE FROM organizations WHERE id = $1', [id]);
    });

    console.log(`[ADMIN] Organization permanently deleted: ${org.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ 
      error: 'Failed to delete organization', 
      details: error.message 
    });
  }
};

/**
 * Get metrics for a specific organization
 */
const getOrganizationMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get metrics
    const metrics = await Organization.getMetrics(id);
    
    // Get partner breakdown
    const partnerBreakdown = await Organization.getPartnerBreakdown(id);

    res.json({
      success: true,
      organization: org,
      metrics,
      partnerBreakdown
    });
  } catch (error) {
    console.error('Error fetching organization metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization metrics', 
      details: error.message 
    });
  }
};

/**
 * Get dashboard statistics for admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const query = `
      WITH org_stats AS (
        SELECT 
          COUNT(*)::int as total_organizations,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int as active_organizations,
          COUNT(*) FILTER (WHERE is_active = FALSE)::int as inactive_organizations
        FROM organizations
      ),
      partner_stats AS (
        SELECT COUNT(*)::int as total_partners
        FROM partners
      ),
      user_stats AS (
        SELECT COUNT(*)::int as total_users
        FROM users
      ),
      session_stats AS (
        SELECT 
          COUNT(*)::int as total_sessions,
          COUNT(*) FILTER (WHERE completed = TRUE)::int as completed_sessions,
          COUNT(*) FILTER (WHERE completed = FALSE)::int as active_sessions,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM sessions
      )
      SELECT 
        os.total_organizations,
        os.active_organizations,
        os.inactive_organizations,
        ps.total_partners,
        us.total_users,
        ss.total_sessions,
        ss.completed_sessions,
        ss.active_sessions,
        ss.sessions_this_month
      FROM org_stats os, partner_stats ps, user_stats us, session_stats ss
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      details: error.message 
    });
  }
};

module.exports = {
  getAllOrganizations,
  createOrganization,
  updateOrganization,
  deactivateOrganization,
  activateOrganization,
  deleteOrganization,
  getOrganizationMetrics,
  getDashboardStats
};

