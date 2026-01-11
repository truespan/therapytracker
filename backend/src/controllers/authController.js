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

    // Check if user credentials already exist - if so, verify password and link to new therapist
    let existingAuth = null;
    if (email) {
      existingAuth = await Auth.findByEmail(email);
    }
    if (!existingAuth) {
      existingAuth = await Auth.findByEmailOrPhone(userData.contact);
    }
    if (!existingAuth) {
      existingAuth = await Auth.findByEmail(usernameForAuth);
    }

    // If existing auth found, handle accordingly
    if (existingAuth) {
      // Only allow linking for existing users
      if (existingAuth.user_type === 'user' && userType === 'user') {
        // Verify password
        const isValidPassword = await bcrypt.compare(password, existingAuth.password_hash);
        if (!isValidPassword) {
          return res.status(409).json({ 
            error: 'You already have an account. Please use your existing username and password to sign in.' 
          });
        }

        // Password matches - link existing user to new therapist
        if (!userData.partner_id) {
          return res.status(400).json({ 
            error: 'Partner ID is required for user signup' 
          });
        }
        
        // Verify Partner ID exists
        const partnerToAssign = await Partner.findByPartnerId(userData.partner_id);
        if (!partnerToAssign) {
          return res.status(400).json({ 
            error: 'Invalid Partner ID. Please check and try again.' 
          });
        }

        // Check if user is already linked to this therapist
        const existingAssignment = await User.assignToPartner(existingAuth.reference_id, partnerToAssign.id);
        if (!existingAssignment) {
          // Already linked, proceed to login
          console.log(`[SIGNUP] User ${existingAuth.reference_id} already linked to partner ${partnerToAssign.id}`);
        } else {
          console.log(`[SIGNUP] Linked existing user ${existingAuth.reference_id} to new partner ${partnerToAssign.id}`);
        }

        // Get user details
        const userDetails = await User.findById(existingAuth.reference_id);

        // Generate JWT token for auto-login
        const token = jwt.sign(
          { 
            id: existingAuth.reference_id, 
            email: existingAuth.email,
            userType: existingAuth.user_type 
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        console.log(`[SIGNUP] Auto-login successful for existing user: ${existingAuth.email || userData.contact}`);

        return res.status(200).json({
          message: 'Linked to new therapist successfully',
          isLinking: true,
          token,
          user: {
            id: existingAuth.reference_id,
            email: userDetails.email || null,
            userType: existingAuth.user_type,
            ...userDetails
          }
        });
      } else {
        // Existing auth for non-user type or mismatched userType - return error
        return res.status(409).json({ 
          error: email ? 'Email already registered' : 'Phone number already registered'
        });
      }
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
            message: 'Check your email for the verification link, and log in after verifying.'
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
          
          console.log(`[LOGIN] Partner ${userDetails.id} (${userDetails.email}) organization:`, {
            org_id: org.id,
            org_name: org.name,
            theraptrack_controlled: org.theraptrack_controlled,
            partner_terms_accepted: userDetails.terms_accepted
          });

          // For all partners (both TheraPTrack controlled and non-controlled orgs), attach subscription data
          const PartnerSubscription = require('../models/PartnerSubscription');
          let activeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
          
          // For all partners, check if subscription expired and revert to Free Plan if needed
          if (!activeSub || !PartnerSubscription.isActive(activeSub)) {
            // Subscription expired or doesn't exist, revert to Free Plan
            console.log(`[LOGIN] Partner ${userDetails.id} subscription expired or missing, reverting to Free Plan`);
            await PartnerSubscription.revertToFreePlan(userDetails.id);
            // Refresh partner data to include new subscription
            userDetails = await Partner.findById(userDetails.id);
            // Re-add organization object
            userDetails.organization = {
              id: org.id,
              name: org.name,
              theraptrack_controlled: org.theraptrack_controlled ?? false,
              video_sessions_enabled: org.video_sessions_enabled ?? true
            };
            // Fetch the new Free Plan subscription
            activeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
          }
          
          // Attach subscription data to userDetails (for both controlled and non-controlled orgs)
          if (activeSub) {
            console.log(`[LOGIN] Partner ${userDetails.id} subscription:`, {
              plan_name: activeSub.plan_name,
              plan_duration_days: activeSub.plan_duration_days,
              subscription_plan_id: activeSub.subscription_plan_id,
              subscription_end_date: activeSub.subscription_end_date,
              is_trial: activeSub.plan_duration_days && activeSub.plan_duration_days > 0
            });
            userDetails.subscription = activeSub;
            userDetails.subscription_plan_id = activeSub.subscription_plan_id;
            userDetails.subscription_billing_period = activeSub.billing_period;
            userDetails.subscription_start_date = activeSub.subscription_start_date;
            userDetails.subscription_end_date = activeSub.subscription_end_date;
          } else {
            // No active subscription, ensure they get Free Plan
            await PartnerSubscription.getOrCreateFreePlan(userDetails.id);
            activeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
            if (activeSub) {
              userDetails.subscription = activeSub;
              userDetails.subscription_plan_id = activeSub.subscription_plan_id;
              userDetails.subscription_billing_period = activeSub.billing_period;
              userDetails.subscription_start_date = activeSub.subscription_start_date;
              userDetails.subscription_end_date = activeSub.subscription_end_date;
            }
          }
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

    // Update last login timestamp (for partners, this helps track system usage)
    if (authRecord.user_type === 'partner') {
      await Auth.updateLastLogin(authRecord.user_type, authRecord.reference_id);
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
          
          // For all partners (both TheraPTrack controlled and non-controlled orgs), attach subscription data
          const PartnerSubscription = require('../models/PartnerSubscription');
          let activeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
          
          // For all partners, check if subscription expired and revert to Free Plan if needed
          if (!activeSub || !PartnerSubscription.isActive(activeSub)) {
            // Subscription expired or doesn't exist, revert to Free Plan
            console.log(`[getCurrentUser] Partner ${userDetails.id} subscription expired or missing, reverting to Free Plan`);
            await PartnerSubscription.revertToFreePlan(userDetails.id);
            // Fetch the new Free Plan subscription
            activeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
          }
          
          // Attach subscription data to userDetails (for both controlled and non-controlled orgs)
          if (activeSub) {
            userDetails.subscription = activeSub;
            userDetails.subscription_plan_id = activeSub.subscription_plan_id;
            userDetails.subscription_billing_period = activeSub.billing_period;
            userDetails.subscription_start_date = activeSub.subscription_start_date;
            userDetails.subscription_end_date = activeSub.subscription_end_date;
          } else {
            // No active subscription, ensure they get Free Plan
            await PartnerSubscription.getOrCreateFreePlan(userDetails.id);
            const freeSub = await PartnerSubscription.getActiveSubscription(userDetails.id);
            if (freeSub) {
              userDetails.subscription = freeSub;
              userDetails.subscription_plan_id = freeSub.subscription_plan_id;
              userDetails.subscription_billing_period = freeSub.billing_period;
              userDetails.subscription_start_date = freeSub.subscription_start_date;
              userDetails.subscription_end_date = freeSub.subscription_end_date;
            }
          }
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
 * Therapist signup using organization signup token or referral code
 */
const therapistSignup = async (req, res) => {
  try {
    const { token, referral_code, password, ...partnerData } = req.body;

    // Validate that either token or referral_code is provided
    if (!token && !referral_code) {
      return res.status(400).json({ error: 'Either signup token or referral code is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!partnerData.name || !partnerData.sex || !partnerData.email || !partnerData.contact || !partnerData.qualification) {
      return res.status(400).json({
        error: 'Name, sex, email, contact, and qualification are required'
      });
    }

    // Get organization either by token or referral code
    let organization = null;
    let referralInfo = null;
    
    if (referral_code) {
      // Lookup organization by referral code
      organization = await Organization.findByReferralCode(referral_code);
      if (!organization) {
        return res.status(404).json({
          error: 'Invalid referral code. Please check the code and try again.'
        });
      }
      
      // Store referral code info for later use
      referralInfo = {
        code: referral_code,
        discount: organization.referral_code_discount,
        discount_type: organization.referral_code_discount_type
      };
    } else {
      // Verify signup token and get organization
      organization = await Organization.verifySignupToken(token);
      if (!organization) {
        return res.status(404).json({
          error: 'Invalid or expired signup link. Please contact your organization for a new link.'
        });
      }
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
        fee_currency: partnerData.fee_currency || 'INR',
        referral_code_used: referralInfo ? referralInfo.code : null,
        referral_discount_applied: referralInfo ? referralInfo.discount : null,
        referral_discount_type: referralInfo ? referralInfo.discount_type : null
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'partner',
        reference_id: partner.id,
        email: partnerData.email,
        password_hash: passwordHash
      }, client);

      // Assign subscription plan based on organization type
      const PartnerSubscription = require('../models/PartnerSubscription');
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      
      if (partnerData.subscription_plan_id) {
        // Use the selected subscription plan (from signup form)
        const plan = await SubscriptionPlan.findById(parseInt(partnerData.subscription_plan_id));
        const startDate = new Date();
        let endDate = null;
        
        if (plan && plan.plan_duration_days && plan.plan_duration_days > 0) {
          // Trial plan with fixed duration
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + plan.plan_duration_days);
        }
        
        await PartnerSubscription.create({
          partner_id: partner.id,
          subscription_plan_id: parseInt(partnerData.subscription_plan_id),
          billing_period: 'monthly',
          subscription_start_date: startDate,
          subscription_end_date: endDate
        }, client);
      } else {
        // Determine default based on organization type
        if (organization.theraptrack_controlled) {
          // TheraPTrack controlled: Use admin-configured default
          const SystemSettings = require('../models/SystemSettings');
          const defaultPlanId = await SystemSettings.getDefaultSubscriptionPlanId();
          
          if (defaultPlanId) {
            const plan = await SubscriptionPlan.findById(defaultPlanId);
            const startDate = new Date();
            let endDate = null;
            
            if (plan && plan.plan_duration_days && plan.plan_duration_days > 0) {
              // Trial plan with fixed duration
              endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + plan.plan_duration_days);
            }
            
            await PartnerSubscription.create({
              partner_id: partner.id,
              subscription_plan_id: defaultPlanId,
              billing_period: 'monthly',
              subscription_start_date: startDate,
              subscription_end_date: endDate
            }, client);
          } else {
            await PartnerSubscription.getOrCreateFreePlan(partner.id, client);
          }
        } else {
          // Non-TheraPTrack controlled: Always Free Plan
          await PartnerSubscription.getOrCreateFreePlan(partner.id, client);
        }
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

const acceptTerms = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    console.log(`[ACCEPT TERMS] User ${userId} (${userType}) accepting terms`);

    let updatedUser;

    if (userType === 'partner') {
      // Update partner terms acceptance
      const result = await db.query(
        `UPDATE partners 
         SET terms_accepted = true, terms_accepted_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      updatedUser = result.rows[0];
      
      // Fetch full partner data with organization
      const partnerData = await Partner.findById(userId);
      updatedUser = partnerData;

    } else if (userType === 'organization') {
      // Update organization terms acceptance
      const result = await db.query(
        `UPDATE organizations 
         SET terms_accepted = true, terms_accepted_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      updatedUser = result.rows[0];
      
      // Fetch full organization data
      const orgData = await Organization.findById(userId);
      updatedUser = orgData;

    } else {
      return res.status(400).json({ 
        error: 'Terms acceptance is only required for partners and organizations' 
      });
    }

    // Update user object in localStorage
    const userObject = {
      id: updatedUser.id,
      userType: userType,
      ...updatedUser
    };

    console.log(`[ACCEPT TERMS] Successfully updated terms for ${userType} ${userId}`);

    res.json({
      success: true,
      message: 'Terms accepted successfully',
      user: userObject
    });

  } catch (error) {
    console.error('[ACCEPT TERMS] Error:', error);
    console.error('[ACCEPT TERMS] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to accept terms',
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
  therapistSignup,
  acceptTerms
};

