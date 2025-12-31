const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');
const Auth = require('../models/Auth');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetEmail } = require('../utils/emailService');
const db = require('../config/database');

const SALT_ROUNDS = 10;

const signup = async (req, res) => {
  try {
    const { userType, password, ...userData } = req.body;
    let { email } = req.body;

    // Trim email if provided
    if (email) {
      email = email.trim();
    }

    // Validate required fields - email is now optional for users
    if (!userType || !password) {
      return res.status(400).json({
        error: 'User type and password are required'
      });
    }

    // Prevent partner and organization signups through public endpoint
    if (userType === 'partner') {
      return res.status(403).json({
        error: 'Therapists cannot sign up directly. Please contact your organization administrator to create your account.'
      });
    }

    if (userType === 'organization') {
      return res.status(403).json({
        error: 'Organizations cannot sign up directly. Please contact the system administrator.'
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Please provide a valid email address' 
        });
      }
    }

    // Validate contact number format - required for users
    if (!userData.contact) {
      return res.status(400).json({ 
        error: 'Contact number is required' 
      });
    }
    
    // Contact should be in format: +[country code][number]
    const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
    if (!phoneRegex.test(userData.contact)) {
      return res.status(400).json({ 
        error: 'Please provide a valid contact number with country code (e.g., +919876543210)' 
      });
    }

    // Determine username for auth_credentials (email or phone)
    // If email is not provided, use phone number as username
    const usernameForAuth = email || userData.contact;

    // Check if email already exists (if email is provided)
    if (email) {
      const existingAuth = await Auth.findByEmail(email);
      if (existingAuth) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    // Check if phone number already exists in users table
    const existingUserByPhone = await User.findByContact(userData.contact);
    if (existingUserByPhone) {
      // Check if this phone number already has auth credentials
      const existingAuthByPhone = await Auth.findByEmailOrPhone(userData.contact);
      if (existingAuthByPhone) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    // Check if username (email or phone) already exists in auth_credentials
    const existingAuthByUsername = await Auth.findByEmail(usernameForAuth);
    if (existingAuthByUsername) {
      return res.status(409).json({ 
        error: email ? 'Email already registered' : 'Phone number already registered' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let newRecord;
    let referenceId;
    let partnerToAssign = null;

    // Pre-validate and fetch partner for user signup
    if (userType === 'user') {
      if (!userData.name || !userData.sex || !userData.age || !userData.contact) {
        return res.status(400).json({ 
          error: 'Name, sex, age, and contact are required for users' 
        });
      }
      
      // Validate Partner ID is provided
      if (!userData.partner_id) {
        return res.status(400).json({ 
          error: 'Partner ID is required for user signup' 
        });
      }
      
      // Verify Partner ID exists BEFORE starting transaction
      partnerToAssign = await Partner.findByPartnerId(userData.partner_id);
      if (!partnerToAssign) {
        return res.status(400).json({ 
          error: 'Invalid Partner ID. Please check and try again.' 
        });
      }
      
      console.log(`[SIGNUP] User signup with Partner ID: ${userData.partner_id} (Partner: ${partnerToAssign.name}, ID: ${partnerToAssign.id})`);
    }

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (client) => {
      // Create user record (only user type is allowed through public signup)
      if (userType !== 'user') {
        throw new Error('Invalid user type for public signup');
      }

      // Create user
      try {
        newRecord = await User.create({ ...userData, email }, client);
        referenceId = newRecord.id;
      } catch (createError) {
        // Handle unique constraint violation for contact field
        if (createError.code === '23505' && createError.constraint === 'users_contact_unique') {
          throw new Error('Phone number already registered');
        }
        // Re-throw other errors
        throw createError;
      }

      console.log(`[SIGNUP] Created user with ID: ${referenceId}`);

      // Automatically assign user to partner
      try {
        const assignment = await User.assignToPartner(referenceId, partnerToAssign.id, client);
        console.log(`[SIGNUP] Successfully assigned user ${referenceId} to partner ${partnerToAssign.id}`);
        console.log(`[SIGNUP] Assignment result:`, assignment);

        if (!assignment) {
          throw new Error('Partner assignment returned no result');
        }
      } catch (assignError) {
        console.error(`[SIGNUP ERROR] Failed to assign user to partner:`, assignError);
        throw new Error(`Failed to link user to partner: ${assignError.message}`);
      }

      // Create auth credentials using email or phone as username
      await Auth.createCredentials({
        user_type: userType,
        reference_id: referenceId,
        email: usernameForAuth, // Use email if provided, otherwise use phone number
        password_hash: passwordHash
      }, client);
      
      console.log(`[SIGNUP] Created auth credentials for ${userType} ID: ${referenceId}`);

      return { newRecord, referenceId };
    });

    // Transaction completed successfully
    newRecord = result.newRecord;
    referenceId = result.referenceId;

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: referenceId, 
        email: usernameForAuth, // Use email or phone as identifier
        userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[SIGNUP] Signup successful for ${userType}: ${usernameForAuth}`);

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: referenceId,
        email: email || null, // Return email if provided, null otherwise
        userType,
        ...newRecord
      }
    });
  } catch (error) {
    console.error('[SIGNUP ERROR] Signup failed:', error);
    console.error('[SIGNUP ERROR] Stack trace:', error.stack);
    
    // Handle specific error messages
    if (error.message === 'Phone number already registered') {
      return res.status(409).json({ 
        error: 'Phone number already registered' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create account', 
      details: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email or phone number and password are required' });
    }

    // Trim whitespace from email/identifier
    const trimmedEmail = email.trim();

    console.log(`[LOGIN] Attempting login with identifier: ${trimmedEmail}`);

    // Find auth credentials by email or phone
    const authRecord = await Auth.findByEmailOrPhone(trimmedEmail);
    if (!authRecord) {
      console.log(`[LOGIN] No auth record found for: ${trimmedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN] Found auth record - Type: ${authRecord.user_type}, ID: ${authRecord.reference_id}`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, authRecord.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch user details based on type
    let userDetails;
    switch (authRecord.user_type) {
      case 'user':
        userDetails = await User.findById(authRecord.reference_id);
        break;
      case 'partner':
        userDetails = await Partner.findById(authRecord.reference_id);

        // Check if partner account is active
        if (!userDetails.is_active) {
          return res.status(403).json({
            error: 'Account deactivated',
            message: 'Your account has been deactivated. Please contact your organization administrator.'
          });
        }

        // Check if partner email is verified
        if (!userDetails.email_verified) {
          return res.status(403).json({
            error: 'Email not verified',
            message: 'Please verify your email address before logging in. Check your inbox for the verification link.'
          });
        }

        // Fetch organization settings for the partner
        if (userDetails && userDetails.organization_id) {
          const org = await Organization.findById(userDetails.organization_id);
          userDetails.organization_video_sessions_enabled = org?.video_sessions_enabled ?? true;
          // Include organization object with theraptrack_controlled
          userDetails.organization = {
            id: org.id,
            name: org.name,
            theraptrack_controlled: org.theraptrack_controlled ?? false,
            video_sessions_enabled: org.video_sessions_enabled ?? true
          };
        }
        break;
      case 'organization':
        userDetails = await Organization.findById(authRecord.reference_id);
        break;
      case 'admin':
        userDetails = await Admin.findById(authRecord.reference_id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid user type' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: authRecord.reference_id,
        email: authRecord.email,
        userType: authRecord.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: authRecord.reference_id,
        email: authRecord.email,
        userType: authRecord.user_type,
        ...userDetails
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { id, userType } = req.user;

    let userDetails;
    switch (userType) {
      case 'user':
        userDetails = await User.findById(id);
        break;
      case 'partner':
        userDetails = await Partner.findById(id);
        // Fetch organization settings for the partner
        if (userDetails && userDetails.organization_id) {
          const org = await Organization.findById(userDetails.organization_id);
          userDetails.organization_video_sessions_enabled = org?.video_sessions_enabled ?? true;
          // Include organization object with theraptrack_controlled
          userDetails.organization = {
            id: org.id,
            name: org.name,
            theraptrack_controlled: org.theraptrack_controlled ?? false,
            video_sessions_enabled: org.video_sessions_enabled ?? true
          };
        }
        break;
      case 'organization':
        userDetails = await Organization.findById(id);
        break;
      case 'admin':
        userDetails = await Admin.findById(id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid user type' });
    }

    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id,
        userType,
        ...userDetails
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user details', details: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or phone

    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    // Trim whitespace from identifier
    const trimmedIdentifier = identifier.trim();

    // Find user by email or phone
    const authRecord = await Auth.findByEmailOrPhone(trimmedIdentifier);
    
    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!authRecord) {
      return res.json({ 
        message: 'If an account exists with that email or phone number, a password reset link has been sent.' 
      });
    }

    // Delete any existing tokens for this email
    await PasswordReset.deleteByEmail(authRecord.email);

    // Create new reset token
    const resetToken = await PasswordReset.createToken(authRecord.email);

    // Send password reset email
    try {
      await sendPasswordResetEmail(authRecord.email, resetToken.token);
      console.log(`Password reset email sent to: ${authRecord.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send password reset email. Please contact support.' 
      });
    }

    res.json({ 
      message: 'If an account exists with that email or phone number, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find and validate token
    const resetToken = await PasswordReset.findByToken(token);
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await Auth.updatePassword(resetToken.email, passwordHash);

    // Delete used token
    await PasswordReset.deleteToken(token);

    console.log(`Password reset successful for: ${resetToken.email}`);

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, userType } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const authRecord = await Auth.findByTypeAndId(userType, id);
    if (!authRecord) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, authRecord.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, authRecord.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await Auth.updatePasswordByReference(userType, id, newPasswordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token, type } = req.query;

    // Validate input
    if (!token || !type) {
      return res.status(400).json({ error: 'Token and type are required' });
    }

    // Only partners need email verification for now
    if (type !== 'partner') {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    // Verify the email using the token
    const verifiedPartner = await Partner.verifyEmail(token);

    if (!verifiedPartner) {
      console.log('Invalid or expired verification link');
      return res.status(400).json({
        error: 'Invalid or expired verification link',
        message: 'This verification link is invalid or has expired. Please contact your organization administrator to resend the verification email.'
      });
    }

    console.log(`Email verified successfully for partner: ${verifiedPartner.email}`);

    res.json({
      message: 'Email verified successfully! You can now log in to your account.',
      partner: {
        id: verifiedPartner.id,
        partner_id: verifiedPartner.partner_id,
        name: verifiedPartner.name,
        email: verifiedPartner.email,
        email_verified: verifiedPartner.email_verified
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    console.error('Error response:', error.response?.data);
    res.status(500).json({ error: 'Failed to verify email', details: error.message });
  }
};

/**
 * Therapist signup using organization signup token
 */
const therapistSignup = async (req, res) => {
  try {
    const { token, password, ...partnerData } = req.body;

    // Validate required fields
    if (!token) {
      return res.status(400).json({ error: 'Signup token is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!partnerData.name || !partnerData.sex || !partnerData.email || !partnerData.contact || !partnerData.qualification) {
      return res.status(400).json({
        error: 'Name, sex, email, contact, and qualification are required'
      });
    }

    // Verify signup token and get organization
    const organization = await Organization.verifySignupToken(token);
    if (!organization) {
      return res.status(404).json({
        error: 'Invalid or expired signup link. Please contact your organization for a new link.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(partnerData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate contact format (must include country code)
    const contactRegex = /^\+\d{1,3}\d{7,15}$/;
    if (!contactRegex.test(partnerData.contact)) {
      return res.status(400).json({
        error: 'Invalid contact format. Must include country code (e.g., +911234567890)'
      });
    }

    // Validate age range (if provided)
    if (partnerData.age !== undefined && partnerData.age !== null && partnerData.age !== '') {
      const ageNum = parseInt(partnerData.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        return res.status(400).json({ error: 'Age must be between 18 and 100' });
      }
    }

    // Validate sex values
    if (!['Male', 'Female', 'Others'].includes(partnerData.sex)) {
      return res.status(400).json({ error: 'Sex must be one of: Male, Female, Others' });
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(partnerData.email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const dateUtils = require('../utils/dateUtils');
    const tokenExpiry = dateUtils.addHours(dateUtils.getCurrentUTC(), 1);

    // Prevent query_resolver from being set during creation (only admins can set it via update)
    if (partnerData.query_resolver !== undefined) {
      return res.status(403).json({ 
        error: 'query_resolver cannot be set during signup. Only administrators can set this flag via update.' 
      });
    }

    // Create partner and auth credentials in transaction
    const result = await db.transaction(async (client) => {
      // Create partner with verification token
      // Explicitly exclude query_resolver to ensure it defaults to false
      const { query_resolver, ...partnerDataWithoutQueryResolver } = partnerData;
      const partner = await Partner.create({
        ...partnerDataWithoutQueryResolver,
        age: partnerData.age !== undefined && partnerData.age !== null && partnerData.age !== '' ? parseInt(partnerData.age) : null,
        organization_id: organization.id,
        verification_token: verificationToken,
        verification_token_expires: tokenExpiry,
        fee_min: partnerData.fee_min !== undefined && partnerData.fee_min !== null && partnerData.fee_min !== '' ? parseFloat(partnerData.fee_min) : null,
        fee_max: partnerData.fee_max !== undefined && partnerData.fee_max !== null && partnerData.fee_max !== '' ? parseFloat(partnerData.fee_max) : null,
        fee_currency: partnerData.fee_currency || 'INR'
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'partner',
        reference_id: partner.id,
        email: partnerData.email,
        password_hash: passwordHash
      }, client);

      // Assign selected subscription plan or default to Free Plan
      const PartnerSubscription = require('../models/PartnerSubscription');
      if (partnerData.subscription_plan_id) {
        // Use the selected subscription plan
        await PartnerSubscription.create({
          partner_id: partner.id,
          subscription_plan_id: parseInt(partnerData.subscription_plan_id),
          billing_period: 'monthly' // Always monthly for individual therapists
        }, client);
      } else {
        // Fallback to Free Plan if no plan selected
        await PartnerSubscription.getOrCreateFreePlan(partner.id, client);
      }

      return partner;
    });

    // Send verification email
    const { sendPartnerVerificationEmail } = require('../utils/emailService');
    let emailSent = false;
    try {
      await sendPartnerVerificationEmail(partnerData.email, verificationToken);
      emailSent = true;
    } catch (emailError) {
      console.error('Error sending partner verification email:', emailError.message || emailError);
      // Don't fail the request if email fails - partner is still created
    }

    res.status(201).json({
      message: emailSent
        ? 'Account created successfully! Please check your email to verify your account.'
        : 'Account created successfully, but verification email could not be sent. Please contact your organization.',
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
    console.error('Therapist signup error:', error);
    res.status(500).json({
      error: 'Failed to create account',
      details: error.message
    });
  }
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  therapistSignup
};

