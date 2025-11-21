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
    const query = 'SELECT * FROM auth_credentials WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByEmailOrPhone(identifier) {
    // First try to find by email
    const emailResult = await this.findByEmail(identifier);
    if (emailResult) {
      return emailResult;
    }

    // If not found by email, try to find by phone number
    // Search in users, partners, and organizations tables
    const phoneQuery = `
      SELECT ac.* FROM auth_credentials ac
      WHERE ac.reference_id IN (
        SELECT id FROM users WHERE contact = $1
        UNION
        SELECT id FROM partners WHERE contact = $1
        UNION
        SELECT id FROM organizations WHERE contact = $1
      )
      AND ac.user_type = CASE
        WHEN EXISTS (SELECT 1 FROM users WHERE contact = $1 AND id = ac.reference_id) THEN 'user'
        WHEN EXISTS (SELECT 1 FROM partners WHERE contact = $1 AND id = ac.reference_id) THEN 'partner'
        WHEN EXISTS (SELECT 1 FROM organizations WHERE contact = $1 AND id = ac.reference_id) THEN 'organization'
      END
    `;
    const phoneResult = await db.query(phoneQuery, [identifier]);
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
      WHERE email = $2
      RETURNING id, user_type, reference_id, email
    `;
    const result = await db.query(query, [newPasswordHash, email]);
    return result.rows[0];
  }

  static async delete(email) {
    const query = 'DELETE FROM auth_credentials WHERE email = $1 RETURNING *';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
}

module.exports = Auth;

