const db = require('../config/database');
const crypto = require('crypto');
const dateUtils = require('../utils/dateUtils');

class AccountSetup {
  static async createToken(userId, client = null) {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiry to 7 days from now using dateUtils
    const expiresAt = dateUtils.addDays(dateUtils.getCurrentUTC(), 7);

    // Delete any existing tokens for this user
    await this.deleteByUserId(userId, client);

    const query = `
      INSERT INTO account_setup_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, created_at
    `;
    const values = [userId, token, expiresAt];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findByToken(token) {
    const query = `
      SELECT * FROM account_setup_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  static async deleteToken(token) {
    const query = 'DELETE FROM account_setup_tokens WHERE token = $1 RETURNING *';
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  static async deleteByUserId(userId, client = null) {
    const query = 'DELETE FROM account_setup_tokens WHERE user_id = $1';
    const dbClient = client || db;
    await dbClient.query(query, [userId]);
  }

  static async deleteExpiredTokens() {
    const query = 'DELETE FROM account_setup_tokens WHERE expires_at <= NOW()';
    const result = await db.query(query);
    return result.rowCount;
  }
}

module.exports = AccountSetup;
