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
    let {
      name,
      email,
      contact,
      address,
      gst_no,
      subscription_plan,
      video_sessions_enabled,
      theraptrack_controlled,
      number_of_therapists,
      password
    } = req.body;

    // Validate required fields
    if (!name || !email || !contact || !password) {
      return res.status(400).json({
        error: 'Name, email, contact, and password are required'
      });
    }

    // Convert empty strings to null for optional fields
    if (gst_no === '') gst_no = null;
    if (subscription_plan === '') subscription_plan = null;

    // Validate subscription plan if provided
    const validPlans = ['basic', 'basic_silver', 'basic_gold', 'pro_silver', 'pro_gold', 'pro_platinum'];
    if (subscription_plan && !validPlans.includes(subscription_plan)) {
      return res.status(400).json({
        error: 'Invalid subscription plan. Must be one of: ' + validPlans.join(', ')
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
        subscription_plan: subscription_plan || null,
        video_sessions_enabled: video_sessions_enabled !== undefined ? video_sessions_enabled : true,
        theraptrack_controlled: theraptrack_controlled !== undefined ? theraptrack_controlled : false,
        number_of_therapists: number_of_therapists ? parseInt(number_of_therapists) : null
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

    // Convert empty strings to null for optional fields
    if (updateData.gst_no === '') updateData.gst_no = null;
    if (updateData.subscription_plan === '') updateData.subscription_plan = null;

    // Validate subscription plan if provided
    const validPlans = ['basic', 'basic_silver', 'basic_gold', 'pro_silver', 'pro_gold', 'pro_platinum'];
    if (updateData.subscription_plan && !validPlans.includes(updateData.subscription_plan)) {
      return res.status(400).json({
        error: 'Invalid subscription plan. Must be one of: ' + validPlans.join(', ')
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

    // Use transaction to delete organization and all related data
    await db.transaction(async (client) => {
      // Step 1: Get all partner IDs for this organization
      const partnersResult = await client.query(
        'SELECT id FROM partners WHERE organization_id = $1',
        [id]
      );
      const partnerIds = partnersResult.rows.map(row => row.id);

      if (partnerIds.length > 0) {
        // Step 2: Get all user IDs linked to these partners
        const usersResult = await client.query(
          'SELECT DISTINCT user_id FROM user_partner_assignments WHERE partner_id = ANY($1)',
          [partnerIds]
        );
        const userIds = usersResult.rows.map(row => row.user_id);

        if (userIds.length > 0) {
          // Step 3: Delete auth credentials for all users/clients first
          await client.query(
            'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
            ['user', userIds]
          );
          console.log(`[ADMIN] Deleted auth credentials for ${userIds.length} users`);

          // Step 4: Delete the users themselves (cascade will handle user_partner_assignments, etc.)
          await client.query(
            'DELETE FROM users WHERE id = ANY($1)',
            [userIds]
          );
          console.log(`[ADMIN] Deleted ${userIds.length} user records`);
        }

        // Step 5: Delete auth credentials for all partners in this organization
        await client.query(
          'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
          ['partner', partnerIds]
        );
        console.log(`[ADMIN] Deleted auth credentials for ${partnerIds.length} partners`);
      }

      // Step 6: Delete auth credentials for the organization itself
      await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2',
        ['organization', id]
      );

      // Step 7: Delete organization (cascade will handle partners and their related data)
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
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_sessions,
          COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress'))::int as active_sessions,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM video_sessions
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

