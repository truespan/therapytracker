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

