const db = require('../config/database');

class Auth {
  static async createCredentials(authData, client = null) {
    const { user_type, reference_id, email, password_hash } = authData;
    const query = `
      INSERT INTO auth_credentials (user_type, reference_id, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_type, reference_id, email
    `;
    const values = [user_type, reference_id, email, password_hash];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM auth_credentials WHERE LOWER(email) = LOWER($1)';
    const result = await db.query(query, [email.trim()]);
    return result.rows[0];
  }

  static async findByEmailOrPhone(identifier) {
    // First try to find by email
    const emailResult = await this.findByEmail(identifier);
    if (emailResult) {
      return emailResult;
    }

    // If not found by email, try to find by phone number
    // Normalize phone number - if it doesn't start with +, assume it's an Indian number
    let phoneNumber = identifier.trim();
    
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
    
    const phoneResult = await db.query(phoneQuery, [identifier, phoneNumber]);
    
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

  static async delete(email) {
    const query = 'DELETE FROM auth_credentials WHERE LOWER(email) = LOWER($1) RETURNING *';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
}

module.exports = Auth;

