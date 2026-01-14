const db = require('../config/database');

class Auth {
  static async createCredentials(authData, client = null) {
    const { user_type, reference_id, email, password_hash, google_id, is_google_user } = authData;
    const query = `
      INSERT INTO auth_credentials (user_type, reference_id, email, password_hash, google_id, is_google_user)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_type, reference_id, email, google_id, is_google_user
    `;
    const values = [user_type, reference_id, email, password_hash, google_id, is_google_user || false];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async createGoogleCredentials(authData, client = null) {
    const { user_type, reference_id, email, google_id } = authData;
    return this.createCredentials({
      user_type,
      reference_id,
      email,
      password_hash: null, // Google users don't have passwords
      google_id,
      is_google_user: true
    }, client);
  }

  static async findByEmail(email) {
    const trimmedEmail = email.trim();
    console.log(`[AUTH] Searching for email: "${trimmedEmail}"`);
    const query = 'SELECT * FROM auth_credentials WHERE LOWER(email) = LOWER($1)';
    const result = await db.query(query, [trimmedEmail]);
    if (result.rows[0]) {
      console.log(`[AUTH] Found user by email - Type: ${result.rows[0].user_type}, ID: ${result.rows[0].reference_id}`);
    } else {
      console.log(`[AUTH] No user found with email: "${trimmedEmail}"`);
    }
    return result.rows[0];
  }

  static async findByEmailOrPhone(identifier) {
    const trimmedIdentifier = identifier.trim();
    
    // Check if identifier looks like an email (contains @)
    const isEmail = trimmedIdentifier.includes('@');
    
    // First try to find by email in auth_credentials
    const emailResult = await this.findByEmail(trimmedIdentifier);
    if (emailResult) {
      return emailResult;
    }

    // If identifier is an email but not found in auth_credentials,
    // check if there's a user/partner/organization with this email
    // (This handles the case where email was updated in user profile but not in auth_credentials)
    if (isEmail) {
      console.log(`[AUTH] Email not found in auth_credentials, checking user/partner/organization tables for: "${trimmedIdentifier}"`);
      
      const emailInProfileQuery = `
        SELECT DISTINCT ac.* FROM auth_credentials ac
        WHERE (
          (ac.user_type = 'user' AND ac.reference_id IN (
            SELECT id FROM users WHERE LOWER(email) = LOWER($1)
          ))
          OR
          (ac.user_type = 'partner' AND ac.reference_id IN (
            SELECT id FROM partners WHERE LOWER(email) = LOWER($1)
          ))
          OR
          (ac.user_type = 'organization' AND ac.reference_id IN (
            SELECT id FROM organizations WHERE LOWER(email) = LOWER($1)
          ))
        )
        LIMIT 1
      `;
      
      const emailInProfileResult = await db.query(emailInProfileQuery, [trimmedIdentifier]);
      
      if (emailInProfileResult.rows[0]) {
        console.log(`[AUTH] Found user by email in profile - Type: ${emailInProfileResult.rows[0].user_type}, ID: ${emailInProfileResult.rows[0].reference_id}`);
        return emailInProfileResult.rows[0];
      }
      
      console.log(`[AUTH] No user found with email: "${trimmedIdentifier}"`);
      return null;
    }

    // If not found by email and identifier doesn't look like email, try to find by phone number
    // Normalize phone number - if it doesn't start with +, assume it's an Indian number
    let phoneNumber = trimmedIdentifier;
    
    // If the identifier is numeric and doesn't start with +, add +91 (India country code)
    if (/^\d+$/.test(phoneNumber)) {
      phoneNumber = `+91${phoneNumber}`;
    }
    
    console.log(`[AUTH] Searching for phone - Original: ${identifier}, Normalized: ${phoneNumber}`);
    
    // Simplified query - search for contact in each table separately and join with auth
    const phoneQuery = `
      SELECT DISTINCT ac.* FROM auth_credentials ac
      WHERE (
        (ac.user_type = 'user' AND ac.reference_id IN (
          SELECT id FROM users WHERE contact = $1 OR contact = $2
        ))
        OR
        (ac.user_type = 'partner' AND ac.reference_id IN (
          SELECT id FROM partners WHERE contact = $1 OR contact = $2
        ))
        OR
        (ac.user_type = 'organization' AND ac.reference_id IN (
          SELECT id FROM organizations WHERE contact = $1 OR contact = $2
        ))
      )
      LIMIT 1
    `;
    
    const phoneResult = await db.query(phoneQuery, [trimmedIdentifier, phoneNumber]);
    
    if (phoneResult.rows[0]) {
      console.log(`[AUTH] Found user by phone - Type: ${phoneResult.rows[0].user_type}, ID: ${phoneResult.rows[0].reference_id}`);
    } else {
      console.log(`[AUTH] No user found with phone: ${identifier} or ${phoneNumber}`);
    }
    
    return phoneResult.rows[0];
  }

  static async findByTypeAndId(userType, referenceId) {
    const query = 'SELECT * FROM auth_credentials WHERE user_type = $1 AND reference_id = $2';
    const result = await db.query(query, [userType, referenceId]);
    return result.rows[0];
  }

  static async findByGoogleId(googleId) {
    const query = 'SELECT * FROM auth_credentials WHERE google_id = $1';
    const result = await db.query(query, [googleId]);
    return result.rows[0];
  }

  static async linkGoogleAccount(email, googleId, client = null) {
    const query = `
      UPDATE auth_credentials
      SET google_id = $1, is_google_user = true
      WHERE LOWER(email) = LOWER($2)
      RETURNING id, user_type, reference_id, email, google_id, is_google_user
    `;
    const dbClient = client || db;
    const result = await dbClient.query(query, [googleId, email]);
    return result.rows[0];
  }

  static async updatePassword(email, newPasswordHash) {
    const query = `
      UPDATE auth_credentials
      SET password_hash = $1
      WHERE LOWER(email) = LOWER($2)
      RETURNING id, user_type, reference_id, email
    `;
    const result = await db.query(query, [newPasswordHash, email]);
    return result.rows[0];
  }

  static async updatePasswordByReference(userType, referenceId, newPasswordHash) {
    const query = `
      UPDATE auth_credentials
      SET password_hash = $1
      WHERE user_type = $2 AND reference_id = $3
      RETURNING id, user_type, reference_id, email
    `;
    const result = await db.query(query, [newPasswordHash, userType, referenceId]);
    return result.rows[0];
  }

  static async updateLastLogin(userType, referenceId) {
    // Ensure last_login column exists first
    try {
      await db.query('ALTER TABLE auth_credentials ADD COLUMN IF NOT EXISTS last_login TIMESTAMP');
    } catch (alterError) {
      // Column might already exist, ignore the error
      if (alterError.code !== '42703' && alterError.code !== '42P16') {
        console.error('Error ensuring last_login column exists:', alterError.message);
      }
    }

    // Ensure first_login column exists
    try {
      await db.query('ALTER TABLE auth_credentials ADD COLUMN IF NOT EXISTS first_login TIMESTAMP');
    } catch (alterError) {
      // Column might already exist, ignore the error
      if (alterError.code !== '42703' && alterError.code !== '42P16') {
        console.error('Error ensuring first_login column exists:', alterError.message);
      }
    }

    // Update last_login and first_login (if null)
    const query = `
      UPDATE auth_credentials
      SET last_login = CURRENT_TIMESTAMP,
          first_login = COALESCE(first_login, CURRENT_TIMESTAMP)
      WHERE user_type = $1 AND reference_id = $2
      RETURNING id, user_type, reference_id, email, last_login, first_login
    `;
    try {
      const result = await db.query(query, [userType, referenceId]);
      if (result.rows.length > 0) {
        console.log(`[AUTH] Updated last_login for ${userType} ID ${referenceId}: ${result.rows[0].last_login}`);
        if (result.rows[0].first_login) {
          console.log(`[AUTH] First login for ${userType} ID ${referenceId}: ${result.rows[0].first_login}`);
        }
        return result.rows[0];
      } else {
        console.warn(`[AUTH] No auth_credentials found for ${userType} ID ${referenceId} to update last_login`);
        return null;
      }
    } catch (error) {
      console.error(`[AUTH] Error updating last_login for ${userType} ID ${referenceId}:`, error.message);
      // Return null if we can't update, but don't fail the operation
      return null;
    }
  }

  static async delete(email) {
    const query = 'DELETE FROM auth_credentials WHERE LOWER(email) = LOWER($1) RETURNING *';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async hasCredentials(userId) {
    const query = 'SELECT id FROM auth_credentials WHERE user_type = $1 AND reference_id = $2';
    const result = await db.query(query, ['user', userId]);
    return result.rows.length > 0;
  }
}

module.exports = Auth;

