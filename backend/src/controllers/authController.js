const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');
const Auth = require('../models/Auth');
const db = require('../config/database');

const SALT_ROUNDS = 10;

const signup = async (req, res) => {
  try {
    const { userType, email, password, ...userData } = req.body;

    // Validate required fields
    if (!userType || !email || !password) {
      return res.status(400).json({ 
        error: 'User type, email, and password are required' 
      });
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
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
      // Create user record based on type
      switch (userType) {
        case 'user':
          // Create user
          newRecord = await User.create({ ...userData, email }, client);
          referenceId = newRecord.id;
          
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
          break;

        case 'partner':
          if (!userData.name || !userData.sex || !userData.age || !userData.contact || !userData.organization_id) {
            throw new Error('Name, sex, age, contact, and organization_id are required for partners');
          }
          newRecord = await Partner.create({ ...userData, email }, client);
          referenceId = newRecord.id;
          console.log(`[SIGNUP] Created partner with ID: ${referenceId}`);
          break;

        case 'organization':
          if (!userData.name || !userData.contact) {
            throw new Error('Name and contact are required for organizations');
          }
          newRecord = await Organization.create({ ...userData, email }, client);
          referenceId = newRecord.id;
          console.log(`[SIGNUP] Created organization with ID: ${referenceId}`);
          break;

        default:
          throw new Error('Invalid user type. Must be user, partner, or organization');
      }

      // Create auth credentials
      await Auth.createCredentials({
        user_type: userType,
        reference_id: referenceId,
        email,
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
        email, 
        userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[SIGNUP] Signup successful for ${userType}: ${email}`);

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: referenceId,
        email,
        userType,
        ...newRecord
      }
    });
  } catch (error) {
    console.error('[SIGNUP ERROR] Signup failed:', error);
    console.error('[SIGNUP ERROR] Stack trace:', error.stack);
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
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find auth credentials
    const authRecord = await Auth.findByEmail(email);
    if (!authRecord) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, authRecord.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch user details based on type
    let userDetails;
    switch (authRecord.user_type) {
      case 'user':
        userDetails = await User.findById(authRecord.reference_id);
        break;
      case 'partner':
        userDetails = await Partner.findById(authRecord.reference_id);
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

module.exports = {
  signup,
  login,
  getCurrentUser
};

