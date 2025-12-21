const db = require('../config/database');

class Partner {
  // Generate a unique Partner ID based on organization name
  static async generatePartnerId(organizationId) {
    // Fetch organization name
    const orgQuery = 'SELECT name FROM organizations WHERE id = $1';
    const orgResult = await db.query(orgQuery, [organizationId]);
    
    if (!orgResult.rows[0]) {
      throw new Error('Organization not found');
    }
    
    const orgName = orgResult.rows[0].name;
    
    // Extract first two letters from organization name (uppercase)
    const prefix = orgName
      .replace(/[^a-zA-Z]/g, '') // Remove non-alphabetic characters
      .substring(0, 2)
      .toUpperCase()
      .padEnd(2, 'X'); // Pad with 'X' if less than 2 letters
    
    // Generate unique Partner ID with collision handling
    let partnerId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!isUnique && attempts < maxAttempts) {
      // Generate 5 random digits
      const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
      partnerId = `${prefix}${randomDigits}`;
      
      // Check if this Partner ID already exists
      const checkQuery = 'SELECT id FROM partners WHERE partner_id = $1';
      const checkResult = await db.query(checkQuery, [partnerId]);
      
      if (checkResult.rows.length === 0) {
        isUnique = true;
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique Partner ID after multiple attempts');
    }
    
    return partnerId;
  }

  static async create(partnerData, client = null) {
    const { name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, organization_id, verification_token, verification_token_expires, fee_min, fee_max, fee_currency, language_preferences, video_sessions_enabled } = partnerData;

    // Generate unique Partner ID
    const partnerId = await this.generatePartnerId(organization_id);

    const query = `
      INSERT INTO partners (partner_id, name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, organization_id, verification_token, verification_token_expires, fee_min, fee_max, fee_currency, language_preferences, video_sessions_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const values = [
      partnerId, name, sex, age || null, email, contact, qualification, license_id || null, address, photo_url,
      work_experience || null, other_practice_details || null, organization_id, verification_token, verification_token_expires,
      fee_min || null, fee_max || null, fee_currency || 'INR', language_preferences || null,
      video_sessions_enabled !== undefined ? video_sessions_enabled : true
    ];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM partners WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM partners WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByPartnerId(partnerId) {
    const query = 'SELECT * FROM partners WHERE partner_id = $1';
    const result = await db.query(query, [partnerId]);
    return result.rows[0];
  }

  static async findByOrganization(organizationId) {
    const query = 'SELECT * FROM partners WHERE organization_id = $1';
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  static async update(id, partnerData) {
    const { name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, email_verified, default_report_template_id, default_report_background, fee_min, fee_max, fee_currency, video_sessions_enabled } = partnerData;
    const query = `
      UPDATE partners
      SET name = COALESCE($1, name),
          sex = COALESCE($2, sex),
          age = CASE WHEN $3::INTEGER IS NULL THEN age ELSE $3::INTEGER END,
          email = COALESCE($4, email),
          contact = COALESCE($5, contact),
          qualification = COALESCE($6, qualification),
          license_id = $7,
          address = COALESCE($8, address),
          photo_url = COALESCE($9, photo_url),
          work_experience = CASE WHEN $10::TEXT IS NULL THEN work_experience ELSE $10::TEXT END,
          other_practice_details = CASE WHEN $11::TEXT IS NULL THEN other_practice_details ELSE $11::TEXT END,
          email_verified = COALESCE($12, email_verified),
          default_report_template_id = CASE WHEN $13::INTEGER IS NULL THEN default_report_template_id ELSE $13::INTEGER END,
          default_report_background = COALESCE($14, default_report_background),
          fee_min = CASE WHEN $15::DECIMAL IS NULL THEN fee_min ELSE $15::DECIMAL END,
          fee_max = CASE WHEN $16::DECIMAL IS NULL THEN fee_max ELSE $16::DECIMAL END,
          fee_currency = COALESCE($17, fee_currency),
          video_sessions_enabled = COALESCE($18, video_sessions_enabled)
      WHERE id = $19
      RETURNING *
    `;
    const values = [
      name, sex, age !== undefined ? age : null, email, contact, qualification,
      license_id !== undefined ? license_id : null, address, photo_url,
      work_experience !== undefined ? work_experience : null,
      other_practice_details !== undefined ? other_practice_details : null,
      email_verified, default_report_template_id, default_report_background,
      fee_min !== undefined ? fee_min : null, fee_max !== undefined ? fee_max : null, fee_currency,
      video_sessions_enabled, id
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM partners WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getUsers(partnerId) {
    const query = `
      SELECT u.* FROM users u
      JOIN user_partner_assignments upa ON u.id = upa.user_id
      WHERE upa.partner_id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  /**
   * Deactivate a partner account
   * @param {number} id - Partner ID
   * @param {number} organizationId - Organization ID that is deactivating
   * @returns {Object} Updated partner record
   */
  static async deactivate(id, organizationId) {
    const query = `
      UPDATE partners
      SET is_active = FALSE,
          deactivated_at = CURRENT_TIMESTAMP,
          deactivated_by = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, organizationId]);
    return result.rows[0];
  }

  /**
   * Activate a partner account
   * @param {number} id - Partner ID
   * @returns {Object} Updated partner record
   */
  static async activate(id) {
    const query = `
      UPDATE partners
      SET is_active = TRUE,
          deactivated_at = NULL,
          deactivated_by = NULL
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Set email verification token for a partner
   * @param {number} id - Partner ID
   * @param {string} token - Verification token
   * @param {Date} expiresAt - Token expiration timestamp
   * @returns {Object} Updated partner record
   */
  static async setVerificationToken(id, token, expiresAt) {
    const query = `
      UPDATE partners
      SET verification_token = $2,
          verification_token_expires = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, token, expiresAt]);
    return result.rows[0];
  }

  /**
   * Verify partner email using token
   * @param {string} token - Verification token
   * @returns {Object} Updated partner record or null if token invalid/expired
   *
   * This method is idempotent - calling it multiple times with the same valid token
   * will return success. This handles cases where:
   * - User clicks the verification link multiple times
   * - React StrictMode causes double API calls in development
   * - Network issues cause retries
   */
  static async verifyEmail(token) {
    // Check if token exists and verify email
    // We don't clear the token to make this operation idempotent
    const query = `
      UPDATE partners
      SET email_verified = TRUE
      WHERE verification_token = $1
        AND (
          verification_token_expires > NOW()
          OR email_verified = TRUE
        )
      RETURNING *
    `;
    const result = await db.query(query, [token]);

    // Return the partner if found, null otherwise
    return result.rows[0] || null;
  }

  /**
   * Get all clients (users) assigned to a partner
   * @param {number} partnerId - Partner ID
   * @returns {Array} Array of users with assignment info
   */
  static async getClients(partnerId) {
    const query = `
      SELECT u.*, upa.assigned_at
      FROM users u
      JOIN user_partner_assignments upa ON u.id = upa.user_id
      WHERE upa.partner_id = $1
      ORDER BY u.name
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  /**
   * Reassign a client from one partner to another
   * @param {number} userId - User/Client ID
   * @param {number} fromPartnerId - Source partner ID
   * @param {number} toPartnerId - Target partner ID
   * @param {Object} client - Optional database client for transactions
   * @returns {Object} New assignment record
   */
  static async reassignClient(userId, fromPartnerId, toPartnerId, client = null) {
    const dbClient = client || db;

    // Remove old assignment
    await dbClient.query(
      'DELETE FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, fromPartnerId]
    );

    // Create new assignment
    const query = `
      INSERT INTO user_partner_assignments (user_id, partner_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, partner_id) DO NOTHING
      RETURNING *
    `;
    const result = await dbClient.query(query, [userId, toPartnerId]);
    return result.rows[0];
  }

  /**
   * Set default report template for a partner
   * @param {number} partnerId - Partner ID
   * @param {number} templateId - Report template ID (null to remove)
   * @returns {Object} Updated partner record
   */
  static async setDefaultReportTemplate(partnerId, templateId) {
    const query = `
      UPDATE partners
      SET default_report_template_id = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [partnerId, templateId]);
    return result.rows[0];
  }

  /**
   * Get default report template for a partner
   * @param {number} partnerId - Partner ID
   * @returns {Object} Partner with report template details
   */
  static async getDefaultReportTemplate(partnerId) {
    const query = `
      SELECT p.*, rt.id as template_id, rt.name as template_name, rt.description as template_description
      FROM partners p
      LEFT JOIN report_templates rt ON p.default_report_template_id = rt.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows[0];
  }

  /**
   * Set default report background image for a partner
   * @param {number} partnerId - Partner ID
   * @param {string} backgroundFilename - Background image filename
   * @returns {Object} Updated partner record
   */
  static async setDefaultReportBackground(partnerId, backgroundFilename) {
    const query = `
      UPDATE partners
      SET default_report_background = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [partnerId, backgroundFilename]);
    return result.rows[0];
  }

  /**
   * Get partner with default report background
   * @param {number} partnerId - Partner ID
   * @returns {Object} Partner record with background info
   */
  static async getDefaultReportBackground(partnerId) {
    const query = `
      SELECT id, name, default_report_background
      FROM partners
      WHERE id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows[0];
  }

  /**
   * Check if video sessions are enabled for a partner
   * @param {number} partnerId - Partner ID
   * @returns {Promise<boolean>} Whether video sessions are enabled for this partner
   */
  static async areVideoSessionsEnabled(partnerId) {
    const query = `
      SELECT video_sessions_enabled
      FROM partners
      WHERE id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows[0]?.video_sessions_enabled ?? true; // Default to true if not set
  }

  /**
   * Get all partners (therapists) for an organization with their video session settings
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Array>} Array of partners with video session settings
   */
  static async getAllWithVideoSettings(organizationId) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.email,
        p.partner_id,
        p.contact,
        p.qualification,
        p.is_active,
        p.created_at,
        p.video_sessions_enabled,
        COUNT(DISTINCT upa.user_id)::int as total_clients,
        COUNT(DISTINCT vs.id)::int as total_sessions,
        COUNT(DISTINCT vs.id) FILTER (WHERE vs.status = 'completed')::int as completed_sessions
      FROM partners p
      LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
      LEFT JOIN video_sessions vs ON p.id = vs.partner_id
      WHERE p.organization_id = $1
      GROUP BY p.id, p.name, p.email, p.partner_id, p.contact, p.qualification, p.is_active, p.created_at, p.video_sessions_enabled
      ORDER BY p.name
    `;
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Update video session setting for a specific partner
   * @param {number} partnerId - Partner ID
   * @param {boolean} enabled - Whether to enable video sessions
   * @returns {Promise<Object>} Updated partner record
   */
  static async updateVideoSessionSetting(partnerId, enabled) {
    const query = `
      UPDATE partners
      SET video_sessions_enabled = $2
      WHERE id = $1
      RETURNING id, name, email, video_sessions_enabled
    `;
    const result = await db.query(query, [partnerId, enabled]);
    return result.rows[0];
  }
}

module.exports = Partner;

