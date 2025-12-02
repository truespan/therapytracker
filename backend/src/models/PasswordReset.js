const db = require('../config/database');
const crypto = require('crypto');

class PasswordReset {
  static async createToken(email) {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const query = `
      INSERT INTO password_reset_tokens (email, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, email, token, expires_at, created_at
    `;
    const values = [email, token, expiresAt];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByToken(token) {
    const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  static async deleteToken(token) {
    const query = 'DELETE FROM password_reset_tokens WHERE token = $1 RETURNING *';
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  static async deleteByEmail(email) {
    const query = 'DELETE FROM password_reset_tokens WHERE email = $1';
    await db.query(query, [email]);
  }

  static async deleteExpiredTokens() {
    const query = 'DELETE FROM password_reset_tokens WHERE expires_at <= NOW()';
    const result = await db.query(query);
    return result.rowCount;
  }
}

module.exports = PasswordReset;




















