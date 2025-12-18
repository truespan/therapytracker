const pool = require('../config/database');

/**
 * GoogleCalendarToken Model
 * Manages Google Calendar OAuth tokens for users and partners
 *
 * Schema:
 * - id: SERIAL PRIMARY KEY
 * - user_type: VARCHAR(20) - 'user' or 'partner'
 * - user_id: INTEGER - ID of user or partner
 * - encrypted_access_token: TEXT - Encrypted access token
 * - encrypted_refresh_token: TEXT - Encrypted refresh token
 * - token_expires_at: TIMESTAMP - When access token expires
 * - calendar_id: VARCHAR(255) - Google Calendar ID (default: 'primary')
 * - sync_enabled: BOOLEAN - Whether sync is enabled
 * - connected_at: TIMESTAMP - When user connected
 * - last_synced_at: TIMESTAMP - Last successful sync
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 */

class GoogleCalendarToken {
  /**
   * Create a new Google Calendar token record
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @param {Object} tokens - Token object
   * @param {string} tokens.encrypted_access_token - Encrypted access token
   * @param {string} tokens.encrypted_refresh_token - Encrypted refresh token
   * @param {Date} tokens.token_expires_at - Token expiration date
   * @param {string} [tokens.calendar_id='primary'] - Google Calendar ID
   * @returns {Promise<Object>} Created token record
   */
  static async create(userType, userId, tokens) {
    const {
      encrypted_access_token,
      encrypted_refresh_token,
      token_expires_at,
      calendar_id = 'primary'
    } = tokens;

    const query = `
      INSERT INTO google_calendar_tokens (
        user_type,
        user_id,
        encrypted_access_token,
        encrypted_refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        connected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      ON CONFLICT (user_type, user_id)
      DO UPDATE SET
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        calendar_id = EXCLUDED.calendar_id,
        sync_enabled = TRUE,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userType,
      userId,
      encrypted_access_token,
      encrypted_refresh_token,
      token_expires_at,
      calendar_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find token by user
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @returns {Promise<Object|null>} Token record or null if not found
   */
  static async findByUser(userType, userId) {
    const query = `
      SELECT * FROM google_calendar_tokens
      WHERE user_type = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [userType, userId]);
    return result.rows[0] || null;
  }

  /**
   * Update token record
   * @param {number} id - Token record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated token record
   */
  static async update(id, updates) {
    const allowedFields = [
      'encrypted_access_token',
      'encrypted_refresh_token',
      'token_expires_at',
      'calendar_id',
      'sync_enabled',
      'last_synced_at'
    ];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE google_calendar_tokens
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete token record (disconnect Google Calendar)
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(userType, userId) {
    const query = `
      DELETE FROM google_calendar_tokens
      WHERE user_type = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [userType, userId]);
    return result.rows.length > 0;
  }

  /**
   * Check if access token is expired
   * @param {Date|string} expiresAt - Token expiration date
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(expiresAt) {
    if (!expiresAt) return true;

    const dateUtils = require('../utils/dateUtils');

    const expiryDate = new Date(expiresAt);
    const now = dateUtils.getCurrentUTC();

    // Add 5 minute buffer to refresh before actual expiry using dateUtils
    const bufferTime = dateUtils.addMinutes(expiryDate, -5);
    return now >= bufferTime;
  }

  /**
   * Update last synced timestamp
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @returns {Promise<Object>} Updated token record
   */
  static async updateSyncStatus(userType, userId) {
    const query = `
      UPDATE google_calendar_tokens
      SET last_synced_at = NOW(), updated_at = NOW()
      WHERE user_type = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [userType, userId]);
    return result.rows[0];
  }

  /**
   * Get all connected users (for admin/monitoring)
   * @returns {Promise<Array>} Array of connected users
   */
  static async getAllConnected() {
    const query = `
      SELECT
        id,
        user_type,
        user_id,
        calendar_id,
        sync_enabled,
        connected_at,
        last_synced_at,
        token_expires_at
      FROM google_calendar_tokens
      WHERE sync_enabled = TRUE
      ORDER BY connected_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Disable sync for a user (keeps token but stops syncing)
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @returns {Promise<Object>} Updated token record
   */
  static async disableSync(userType, userId) {
    const query = `
      UPDATE google_calendar_tokens
      SET sync_enabled = FALSE, updated_at = NOW()
      WHERE user_type = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [userType, userId]);
    return result.rows[0];
  }

  /**
   * Enable sync for a user
   * @param {string} userType - 'user' or 'partner'
   * @param {number} userId - User or partner ID
   * @returns {Promise<Object>} Updated token record
   */
  static async enableSync(userType, userId) {
    const query = `
      UPDATE google_calendar_tokens
      SET sync_enabled = TRUE, updated_at = NOW()
      WHERE user_type = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [userType, userId]);
    return result.rows[0];
  }
}

module.exports = GoogleCalendarToken;
