const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');
const Auth = require('../models/Auth');
const db = require('../config/database');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authenticate = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];

    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google account' });
    }

    console.log(`[GOOGLE AUTH] Attempting authentication for: ${email} (Google ID: ${googleId})`);

    // Check if user exists by Google ID
    let authRecord = await Auth.findByGoogleId(googleId);
    
    if (authRecord) {
      console.log(`[GOOGLE AUTH] Found existing user by Google ID - Type: ${authRecord.user_type}`);
      // User exists with this Google ID, proceed with login
      return await handleExistingUser(authRecord, res);
    }

    // Check if user exists by email (for account linking)
    authRecord = await Auth.findByEmail(email);
    
    if (authRecord) {
      console.log(`[GOOGLE AUTH] Found existing user by email - Type: ${authRecord.user_type}`);
      // User exists with this email, link Google account and login
      return await handleAccountLinking(authRecord, googleId, res);
    }

    // No existing user found, create new user
    console.log(`[GOOGLE AUTH] Creating new user for: ${email}`);
    return await handleNewUser({ googleId, email, name, picture }, res);

  } catch (error) {
    console.error('[GOOGLE AUTH ERROR] Authentication failed:', error);
    res.status(401).json({ 
      error: 'Google authentication failed', 
      details: error.message 
    });
  }
};

const handleExistingUser = async (authRecord, res) => {
  try {
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
            message: 'Please verify your email address before logging in.'
          });
        }
        // Fetch organization settings for the partner (same as regular login)
        if (userDetails && userDetails.organization_id) {
          const Organization = require('../models/Organization');
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

    if (!userDetails) {
      return res.status(404).json({ error: 'User details not found' });
    }

    // Update last login timestamp (for partners, this helps track system usage)
    if (authRecord.user_type === 'partner') {
      const Auth = require('../models/Auth');
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

    console.log(`[GOOGLE AUTH] Login successful for ${authRecord.user_type}: ${authRecord.email}`);

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: authRecord.reference_id,
        email: authRecord.email,
        userType: authRecord.user_type,
        ...userDetails
      }
    });
  } catch (error) {
    console.error('[GOOGLE AUTH ERROR] Failed to handle existing user:', error);
    res.status(500).json({ error: 'Failed to process login', details: error.message });
  }
};

const handleAccountLinking = async (authRecord, googleId, res) => {
  try {
    // Link Google account to existing user
    await Auth.linkGoogleAccount(authRecord.email, googleId);
    
    console.log(`[GOOGLE AUTH] Linked Google account to existing ${authRecord.user_type}`);
    
    // Proceed with login
    return await handleExistingUser(authRecord, res);
  } catch (error) {
    console.error('[GOOGLE AUTH ERROR] Failed to link Google account:', error);
    res.status(500).json({ error: 'Failed to link Google account', details: error.message });
  }
};

const handleNewUser = async (googleUser, res) => {
  try {
    const { googleId, email, name, picture } = googleUser;
    
    // IMPORTANT: Only CLIENT users can sign up via Google
    // Organization and Partner users must be created through proper channels
    
    return res.status(400).json({
      error: 'Google signup restricted',
      message: 'Only client users can sign up with Google. Organization and Partner users must be created by administrators.',
      googleUser: {
        googleId,
        email,
        name,
        picture
      },
      allowedUserTypes: ['user'], // Only 'user' (client) type can sign up with Google
      instructions: 'If you are a client, please use the signup form and provide a valid Partner ID.'
    });
  } catch (error) {
    console.error('[GOOGLE AUTH ERROR] Failed to handle new user:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
};

// New endpoint for client users to complete Google signup with required information
const completeClientSignup = async (req, res) => {
  try {
    const { token, partner_id, contact, age, sex, address } = req.body;
    
    if (!token || !partner_id || !contact || !age || !sex) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Partner ID, contact, age, and sex are required for client signup'
      });
    }
    
    // Verify Google token again
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google account' });
    }
    
    // Check if user already exists
    let existingAuth = await Auth.findByGoogleId(googleId);
    if (existingAuth) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Verify Partner ID exists
    const partner = await Partner.findByPartnerId(partner_id);
    if (!partner) {
      return res.status(400).json({
        error: 'Invalid Partner ID',
        message: 'Please check the Partner ID provided by your therapist'
      });
    }
    
    console.log(`[GOOGLE SIGNUP] Creating client user with Partner ID: ${partner_id}`);
    
    // Create user in transaction
    const result = await db.transaction(async (client) => {
      // Create user
      const userData = {
        name: name || email.split('@')[0],
        email: email,
        contact: contact,
        age: parseInt(age),
        sex: sex,
        address: address || null
      };
      
      let newUser;
      try {
        newUser = await User.create(userData, client);
      } catch (createError) {
        // Handle unique constraint violation for contact field
        if (createError.code === '23505' && createError.constraint === 'users_contact_unique') {
          throw new Error('Phone number already registered');
        }
        // Re-throw other errors
        throw createError;
      }
      
      // Assign to partner
      await User.assignToPartner(newUser.id, partner.id, client);
      
      // Create Google auth credentials
      await Auth.createGoogleCredentials({
        user_type: 'user',
        reference_id: newUser.id,
        email: email,
        google_id: googleId
      }, client);
      
      return newUser;
    });
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: result.id,
        email: email,
        userType: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`[GOOGLE SIGNUP] Client signup successful: ${email}`);
    
    res.status(201).json({
      message: 'Google signup successful',
      token: jwtToken,
      user: {
        id: result.id,
        email: email,
        userType: 'user',
        ...result
      }
    });
    
  } catch (error) {
    console.error('[GOOGLE SIGNUP ERROR] Failed to complete signup:', error);
    
    // Handle specific error messages
    if (error.message === 'Phone number already registered') {
      return res.status(409).json({ 
        error: 'Phone number already registered' 
      });
    }
    
    res.status(500).json({
      error: 'Failed to complete signup',
      details: error.message
    });
  }
};

module.exports = {
  authenticate,
  completeClientSignup
};