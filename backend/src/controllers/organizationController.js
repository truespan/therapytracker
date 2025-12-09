const Organization = require('../models/Organization');
const Partner = require('../models/Partner');
const Auth = require('../models/Auth');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');
const { sendPartnerVerificationEmail } = require('../utils/emailService');

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

const createPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sex, age, email, contact, qualification, address, password, photo_url } = req.body;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to create partner for this organization' });
    }

    // Validate required fields
    if (!name || !sex || !age || !email || !contact || !qualification || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, sex, age, email, contact, qualification, password' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate contact format (must include country code)
    const contactRegex = /^\+\d{1,3}\d{7,15}$/;
    if (!contactRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid contact format. Must include country code (e.g., +911234567890)' });
    }

    // Validate age range
    if (age < 18 || age > 100) {
      return res.status(400).json({ error: 'Age must be between 18 and 100' });
    }

    // Validate sex values
    if (!['Male', 'Female', 'Others'].includes(sex)) {
      return res.status(400).json({ error: 'Sex must be one of: Male, Female, Others' });
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create partner and auth credentials in transaction
    const result = await db.transaction(async (client) => {
      // Create partner with verification token
      const partner = await Partner.create({
        name,
        sex,
        age,
        email,
        contact,
        qualification,
        address,
        photo_url,
        organization_id: id,
        verification_token: verificationToken,
        verification_token_expires: tokenExpiry
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'partner',
        reference_id: partner.id,
        email,
        password_hash: passwordHash
      }, client);

      return partner;
    });

    // Send verification email
    let emailSent = false;
    try {
      await sendPartnerVerificationEmail(email, verificationToken);
      emailSent = true;
    } catch (emailError) {
      console.error('Error sending partner verification email:', emailError.message || emailError);
      console.error('Partner created but verification email failed to send. Partner ID:', result.partner_id);
      console.error('Email error details:', {
        email: email,
        error: emailError.message || emailError.toString(),
        code: emailError.code || 'UNKNOWN'
      });
      // Don't fail the request if email fails - partner is still created
      // The verification email can be resent using the resend-verification endpoint
    }

    res.status(201).json({
      message: emailSent 
        ? 'Partner created successfully. Verification email sent.' 
        : 'Partner created successfully, but verification email could not be sent. Please use "Resend Verification Email" option.',
      emailSent: emailSent,
      partner: {
        id: result.id,
        partner_id: result.partner_id,
        name: result.name,
        email: result.email,
        email_verified: result.email_verified
      }
    });
  } catch (error) {
    console.error('Create partner error:', error);
    res.status(500).json({ error: 'Failed to create partner', details: error.message });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { id, partnerId } = req.params;
    const updates = req.body;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update partner for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    // Prevent changing organization_id and partner_id
    delete updates.organization_id;
    delete updates.partner_id;

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email already exists (exclude current partner)
      const existingAuth = await Auth.findByEmail(updates.email);
      if (existingAuth && existingAuth.reference_id !== parseInt(partnerId)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // Validate contact format if provided
    if (updates.contact) {
      const contactRegex = /^\+\d{1,3}\d{7,15}$/;
      if (!contactRegex.test(updates.contact)) {
        return res.status(400).json({ error: 'Invalid contact format. Must include country code (e.g., +911234567890)' });
      }
    }

    // Validate age if provided
    if (updates.age && (updates.age < 18 || updates.age > 100)) {
      return res.status(400).json({ error: 'Age must be between 18 and 100' });
    }

    // Validate sex if provided
    if (updates.sex && !['Male', 'Female', 'Others'].includes(updates.sex)) {
      return res.status(400).json({ error: 'Sex must be one of: Male, Female, Others' });
    }

    // Handle email change - reset verification
    if (updates.email && updates.email !== partner.email) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.transaction(async (client) => {
        // Update partner email and reset verification
        updates.email_verified = false;
        const updatedPartner = await Partner.update(partnerId, updates);

        // Set new verification token
        await Partner.setVerificationToken(partnerId, verificationToken, tokenExpiry);

        // Update auth credentials email
        await client.query(
          'UPDATE auth_credentials SET email = $1 WHERE user_type = $2 AND reference_id = $3',
          [updates.email, 'partner', partnerId]
        );
      });

      // Send new verification email
      let emailSent = false;
      try {
        await sendPartnerVerificationEmail(updates.email, verificationToken);
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending partner verification email after update:', emailError.message || emailError);
        console.error('Email error details:', {
          email: updates.email,
          partnerId: partnerId,
          error: emailError.message || emailError.toString(),
          code: emailError.code || 'UNKNOWN'
        });
      }

      res.json({ 
        message: emailSent
          ? 'Partner updated successfully. New verification email sent.'
          : 'Partner updated successfully, but verification email could not be sent. Please use "Resend Verification Email" option.',
        emailSent: emailSent
      });
    } else {
      // Normal update without email change
      const updatedPartner = await Partner.update(partnerId, updates);
      res.json({
        message: 'Partner updated successfully',
        partner: updatedPartner
      });
    }
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({ error: 'Failed to update partner', details: error.message });
  }
};

const deactivatePartner = async (req, res) => {
  try {
    const { id, partnerId } = req.params;
    const { reassignToPartnerId, clientIds } = req.body;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to deactivate partner for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    // If reassignment requested, validate target partner
    if (reassignToPartnerId) {
      const targetPartner = await Partner.findById(reassignToPartnerId);
      if (!targetPartner) {
        return res.status(404).json({ error: 'Target partner not found for reassignment' });
      }

      if (targetPartner.organization_id !== parseInt(id)) {
        return res.status(403).json({ error: 'Target partner does not belong to this organization' });
      }

      if (!targetPartner.is_active) {
        return res.status(400).json({ error: 'Cannot reassign to inactive partner' });
      }

      // Perform reassignment and deactivation in transaction
      await db.transaction(async (client) => {
        // Get clients to reassign (or all if not specified)
        const clients = clientIds && clientIds.length > 0
          ? clientIds
          : (await Partner.getClients(partnerId)).map(c => c.id);

        // Reassign each client
        for (const clientId of clients) {
          await Partner.reassignClient(clientId, partnerId, reassignToPartnerId, client);
        }

        // Deactivate partner
        await Partner.deactivate(partnerId, id);
      });

      res.json({
        message: 'Partner deactivated successfully. Clients reassigned.',
        reassignedClients: clientIds || 'all'
      });
    } else {
      // Simple deactivation without reassignment
      await Partner.deactivate(partnerId, id);
      res.json({ message: 'Partner deactivated successfully' });
    }
  } catch (error) {
    console.error('Deactivate partner error:', error);
    res.status(500).json({ error: 'Failed to deactivate partner', details: error.message });
  }
};

const activatePartner = async (req, res) => {
  try {
    const { id, partnerId } = req.params;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to activate partner for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    await Partner.activate(partnerId);
    res.json({ message: 'Partner activated successfully' });
  } catch (error) {
    console.error('Activate partner error:', error);
    res.status(500).json({ error: 'Failed to activate partner', details: error.message });
  }
};

const getPartnerClients = async (req, res) => {
  try {
    const { id, partnerId } = req.params;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view partner clients for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    const clients = await Partner.getClients(partnerId);
    res.json({ clients });
  } catch (error) {
    console.error('Get partner clients error:', error);
    res.status(500).json({ error: 'Failed to fetch partner clients', details: error.message });
  }
};

const reassignClients = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromPartnerId, toPartnerId, clientIds } = req.body;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to reassign clients for this organization' });
    }

    // Validate required fields
    if (!fromPartnerId || !toPartnerId || !clientIds || clientIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: fromPartnerId, toPartnerId, clientIds' });
    }

    // Validate source partner
    const sourcePartner = await Partner.findById(fromPartnerId);
    if (!sourcePartner) {
      return res.status(404).json({ error: 'Source partner not found' });
    }
    if (sourcePartner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Source partner does not belong to this organization' });
    }

    // Validate target partner
    const targetPartner = await Partner.findById(toPartnerId);
    if (!targetPartner) {
      return res.status(404).json({ error: 'Target partner not found' });
    }
    if (targetPartner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Target partner does not belong to this organization' });
    }
    if (!targetPartner.is_active) {
      return res.status(400).json({ error: 'Cannot reassign to inactive partner' });
    }

    // Reassign clients in transaction
    await db.transaction(async (client) => {
      for (const clientId of clientIds) {
        await Partner.reassignClient(clientId, fromPartnerId, toPartnerId, client);
      }
    });

    res.json({
      message: 'Clients reassigned successfully',
      count: clientIds.length
    });
  } catch (error) {
    console.error('Reassign clients error:', error);
    res.status(500).json({ error: 'Failed to reassign clients', details: error.message });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { id, partnerId } = req.params;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to resend verification for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    // Check if already verified
    if (partner.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update verification token
    await Partner.setVerificationToken(partnerId, verificationToken, tokenExpiry);

    // Send verification email
    try {
      await sendPartnerVerificationEmail(partner.email, verificationToken);
      res.json({ message: 'Verification email sent successfully' });
    } catch (emailError) {
      console.error('Error sending partner verification email:', emailError.message || emailError);
      console.error('Email error details:', {
        email: partner.email,
        partnerId: partnerId,
        error: emailError.message || emailError.toString(),
        code: emailError.code || 'UNKNOWN'
      });
      
      // Provide more helpful error message to the client
      const errorMessage = emailError.message || 'Failed to send verification email. Please check email configuration.';
      return res.status(500).json({ 
        error: 'Failed to send verification email',
        details: errorMessage,
        hint: 'Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD configuration. For connection timeout errors, verify network connectivity to the email server.'
      });
    }
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({ error: 'Failed to resend verification email', details: error.message });
  }
};

const deletePartner = async (req, res) => {
  try {
    const { id, partnerId } = req.params;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to delete partners for this organization' });
    }

    // Find partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify partner belongs to organization
    if (partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Partner does not belong to this organization' });
    }

    // Check if partner has any clients
    const clients = await Partner.getClients(partnerId);
    if (clients.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete partner with assigned clients',
        message: `This therapist has ${clients.length} client(s) assigned. Please reassign or remove all clients before deleting.`
      });
    }

    // Delete partner and their auth record in transaction
    await db.transaction(async (client) => {
      // Delete auth record first
      await client.query('DELETE FROM auth_credentials WHERE reference_id = $1 AND user_type = $2', [partnerId, 'partner']);

      // Delete partner
      await client.query('DELETE FROM partners WHERE id = $1', [partnerId]);
    });

    console.log(`Partner ${partner.name} (ID: ${partnerId}) deleted by organization ${id}`);

    res.json({
      message: 'Therapist deleted successfully',
      deletedPartner: {
        id: partner.id,
        name: partner.name,
        email: partner.email
      }
    });
  } catch (error) {
    console.error('Delete partner error:', error);
    res.status(500).json({ error: 'Failed to delete therapist', details: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id: organizationId, clientId } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization - only organization can delete its clients
    if (req.user.userType !== 'organization' || req.user.id !== parseInt(organizationId)) {
      return res.status(403).json({ error: 'Unauthorized to delete clients' });
    }

    // Use transaction to ensure all related data is deleted atomically
    await db.transaction(async (client) => {
      // Verify client exists and belongs to this organization
      const userCheck = await client.query(
        `SELECT u.id, u.name, u.email
         FROM users u
         JOIN user_partner_assignments upa ON u.id = upa.user_id
         JOIN partners p ON upa.partner_id = p.id
         WHERE u.id = $1 AND p.organization_id = $2
         LIMIT 1`,
        [clientId, organizationId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('Client not found or does not belong to this organization');
      }

      const user = userCheck.rows[0];
      console.log(`[DELETE CLIENT] Starting deletion for client: ${user.name} (ID: ${clientId})`);

      // Delete in order to respect foreign key constraints:

      // 1. Delete questionnaire responses
      await client.query(
        'DELETE FROM user_questionnaire_responses WHERE assignment_id IN (SELECT id FROM user_questionnaire_assignments WHERE user_id = $1)',
        [clientId]
      );
      console.log(`[DELETE CLIENT] Deleted questionnaire responses for user ${clientId}`);

      // 2. Delete questionnaire text responses
      await client.query(
        'DELETE FROM user_questionnaire_text_responses WHERE assignment_id IN (SELECT id FROM user_questionnaire_assignments WHERE user_id = $1)',
        [clientId]
      );
      console.log(`[DELETE CLIENT] Deleted questionnaire textresponses for user ${clientId}`);

      // 3. Delete questionnaire assignments
      await client.query('DELETE FROM user_questionnaire_assignments WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted questionnaire assignments for user ${clientId}`);

      // 4. Delete shared charts
      await client.query('DELETE FROM shared_charts WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted shared charts for user ${clientId}`);

      // 5. Delete therapy sessions
      await client.query('DELETE FROM therapy_sessions WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted therapy sessions for user ${clientId}`);

      // 6. Delete video sessions
      await client.query('DELETE FROM video_sessions WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted video sessions for user ${clientId}`);

      // 7. Delete appointments
      await client.query('DELETE FROM appointments WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted appointments for user ${clientId}`);

      // 8. Delete user-partner assignments
      await client.query('DELETE FROM user_partner_assignments WHERE user_id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted user-partner assignments for user ${clientId}`);

      // 9. Delete auth credentials
      await client.query('DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2', ['user', clientId]);
      console.log(`[DELETE CLIENT] Deleted auth credentials for user ${clientId}`);

      // 10. Finally, delete the user record
      await client.query('DELETE FROM users WHERE id = $1', [clientId]);
      console.log(`[DELETE CLIENT] Deleted user record for user ${clientId}`);
    });

    console.log(`[DELETE CLIENT] Successfully deleted client ${clientId} and all associated data`);

    res.json({
      message: 'Client and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE CLIENT ERROR]:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete client',
      details: error.message
    });
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationPartners,
  getOrganizationUsers,
  createPartner,
  updatePartner,
  deactivatePartner,
  activatePartner,
  getPartnerClients,
  reassignClients,
  resendVerificationEmail,
  deletePartner,
  deleteClient
};

