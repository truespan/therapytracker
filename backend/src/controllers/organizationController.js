const Organization = require('../models/Organization');
const Partner = require('../models/Partner');
const Auth = require('../models/Auth');
const SubscriptionPlan = require('../models/SubscriptionPlan');
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

    console.log('Update organization request:', { id, updates });

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this organization' });
    }

    console.log('Calling Organization.update with:', updates);
    const updatedOrganization = await Organization.update(id, updates);
    console.log('Updated organization:', updatedOrganization);
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
    const { name, sex, age, email, contact, qualification, license_id, address, password, photo_url, work_experience, other_practice_details, fee_min, fee_max, fee_currency } = req.body;

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to create partner for this organization' });
    }

    // Validate required fields (age is now optional)
    if (!name || !sex || !email || !contact || !qualification || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, sex, email, contact, qualification, password' });
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

    // Validate age range (if provided)
    if (age !== undefined && age !== null && age !== '') {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        return res.status(400).json({ error: 'Age must be between 18 and 100' });
      }
    }

    // Validate sex values
    if (!['Male', 'Female', 'Others'].includes(sex)) {
      return res.status(400).json({ error: 'Sex must be one of: Male, Female, Others' });
    }

    // Validate fee range (optional, but if provided, must be valid)
    if (fee_min !== undefined && fee_min !== null && fee_min !== '') {
      const feeMinNum = parseFloat(fee_min);
      if (isNaN(feeMinNum) || feeMinNum < 0) {
        return res.status(400).json({ error: 'Minimum fee must be a valid positive number' });
      }
    }
    if (fee_max !== undefined && fee_max !== null && fee_max !== '') {
      const feeMaxNum = parseFloat(fee_max);
      if (isNaN(feeMaxNum) || feeMaxNum < 0) {
        return res.status(400).json({ error: 'Maximum fee must be a valid positive number' });
      }
    }
    if (fee_min !== undefined && fee_min !== null && fee_min !== '' && 
        fee_max !== undefined && fee_max !== null && fee_max !== '') {
      const feeMinNum = parseFloat(fee_min);
      const feeMaxNum = parseFloat(fee_max);
      if (feeMinNum > feeMaxNum) {
        return res.status(400).json({ error: 'Maximum fee must be greater than or equal to minimum fee' });
      }
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if organization exists and get TheraPTrack controlled status
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
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
        age: age !== undefined && age !== null && age !== '' ? parseInt(age) : null,
        email,
        contact,
        qualification,
        license_id,
        address,
        photo_url,
        work_experience,
        other_practice_details,
        organization_id: id,
        verification_token: verificationToken,
        verification_token_expires: tokenExpiry,
        fee_min: fee_min !== undefined && fee_min !== null && fee_min !== '' ? parseFloat(fee_min) : null,
        fee_max: fee_max !== undefined && fee_max !== null && fee_max !== '' ? parseFloat(fee_max) : null,
        fee_currency: fee_currency || 'INR'
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'partner',
        reference_id: partner.id,
        email,
        password_hash: passwordHash
      }, client);

      // If organization is TheraPTrack controlled, automatically assign Free Plan
      if (organization.theraptrack_controlled) {
        const PartnerSubscription = require('../models/PartnerSubscription');
        await PartnerSubscription.getOrCreateFreePlan(partner.id, client);
      }

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
    if (updates.age !== undefined && updates.age !== null && updates.age !== '') {
      const ageNum = parseInt(updates.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        return res.status(400).json({ error: 'Age must be between 18 and 100' });
      }
      updates.age = ageNum;
    } else if (updates.age === null || updates.age === '') {
      updates.age = null;
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

/**
 * Get subscription details for an organization
 */
const getSubscriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this organization\'s subscription' });
    }

    // Get subscription details with plan information
    const subscriptionDetails = await Organization.getSubscriptionDetails(id);

    res.json({
      success: true,
      subscription: subscriptionDetails
    });
  } catch (error) {
    console.error('Get subscription details error:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription details',
      details: error.message
    });
  }
};

/**
 * Update subscription for an organization
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subscription_plan_id,
      subscription_billing_period,
      subscription_start_date,
      subscription_end_date,
      number_of_therapists
    } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization - only organization itself or admin can update
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this organization\'s subscription' });
    }

    // Validate billing period if provided
    if (subscription_billing_period) {
      const validPeriods = ['yearly', 'quarterly', 'monthly'];
      if (!validPeriods.includes(subscription_billing_period)) {
        return res.status(400).json({
          error: 'Invalid billing period. Must be one of: yearly, quarterly, monthly'
        });
      }
    }

    // Validate subscription plan if provided
    if (subscription_plan_id) {
      const plan = await SubscriptionPlan.findById(subscription_plan_id);
      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Validate therapist range for organization plans
      const therapistCount = number_of_therapists !== undefined ? number_of_therapists : organization.number_of_therapists;
      if (therapistCount && plan.plan_type === 'organization') {
        const isValid = await SubscriptionPlan.validatePlanForOrganization(subscription_plan_id, therapistCount);
        if (!isValid) {
          return res.status(400).json({
            error: 'Selected plan is not compatible with your organization size. Please choose a plan that matches your therapist count.'
          });
        }
      }
    }

    // Validate number of therapists
    if (number_of_therapists !== undefined && number_of_therapists < 1) {
      return res.status(400).json({
        error: 'number_of_therapists must be >= 1'
      });
    }

    // Build update object
    const updateData = {};
    if (subscription_plan_id !== undefined) {
      updateData.subscription_plan_id = subscription_plan_id;
    }
    if (subscription_billing_period !== undefined) {
      updateData.subscription_billing_period = subscription_billing_period;
    }
    if (subscription_start_date !== undefined) {
      updateData.subscription_start_date = subscription_start_date;
    }
    if (subscription_end_date !== undefined) {
      updateData.subscription_end_date = subscription_end_date;
    }
    if (number_of_therapists !== undefined) {
      updateData.number_of_therapists = number_of_therapists;
    }

    // Update organization
    const updatedOrganization = await Organization.update(id, updateData);

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      organization: updatedOrganization
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      details: error.message
    });
  }
};

/**
 * Calculate subscription price for an organization
 */
const calculateSubscriptionPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, number_of_therapists, billing_period } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to calculate price for this organization' });
    }

    // Use provided values or organization's current values
    const planId = plan_id || organization.subscription_plan_id;
    const numTherapists = number_of_therapists || organization.number_of_therapists || 1;
    const billingPeriod = billing_period || organization.subscription_billing_period || 'monthly';

    if (!planId) {
      return res.status(400).json({
        error: 'Subscription plan ID is required'
      });
    }

    // Calculate price
    const totalPrice = await SubscriptionPlan.calculateOrganizationPrice(
      planId,
      numTherapists,
      billingPeriod
    );

    // Get plan details
    const plan = await SubscriptionPlan.findById(planId);
    const pricePerTherapist = await SubscriptionPlan.getPrice(planId, 'organization', billingPeriod);

    res.json({
      success: true,
      plan_id: planId,
      plan_name: plan?.plan_name,
      number_of_therapists: numTherapists,
      billing_period: billingPeriod,
      price_per_therapist: pricePerTherapist,
      total_price: totalPrice
    });
  } catch (error) {
    console.error('Calculate subscription price error:', error);
    res.status(500).json({
      error: 'Failed to calculate subscription price',
      details: error.message
    });
  }
};

/**
 * Get or create therapist signup token for an organization
 */
const getTherapistSignupToken = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to get signup token for this organization' });
    }

    // Check if organization is TheraPTrack controlled
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({
        error: 'Therapist signup URLs are only available for TheraPTrack controlled organizations'
      });
    }

    // Get or create token
    const tokenData = await Organization.getOrCreateSignupToken(id);

    // Construct the signup URL - use theraptrack.com for production
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://theraptrack.com'
      : (process.env.FRONTEND_URL || 'http://localhost:3000');
    const signupUrl = `${frontendUrl}/therapist-signup/${tokenData.token}`;

    res.json({
      success: true,
      token: tokenData.token,
      signup_url: signupUrl,
      created_at: tokenData.created_at,
      is_new: tokenData.is_new
    });
  } catch (error) {
    console.error('Get therapist signup token error:', error);
    res.status(500).json({
      error: 'Failed to get signup token',
      details: error.message
    });
  }
};

/**
 * Verify a therapist signup token (public endpoint)
 */
const verifyTherapistSignupToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log('Verifying therapist signup token:', token);

    const organization = await Organization.verifySignupToken(token);

    if (!organization) {
      console.log('Token verification failed - no organization found or token invalid');
      return res.status(404).json({
        error: 'Invalid or expired signup link',
        valid: false
      });
    }

    console.log('Token verification successful for organization:', organization.name);

    res.json({
      success: true,
      valid: true,
      organization_id: organization.id,
      organization_name: organization.name
    });
  } catch (error) {
    console.error('Verify therapist signup token error:', error);
    res.status(500).json({
      error: 'Failed to verify token',
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
  deleteClient,
  getSubscriptionDetails,
  updateSubscription,
  calculateSubscriptionPrice,
  getTherapistSignupToken,
  verifyTherapistSignupToken
};

