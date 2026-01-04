const db = require('../config/database');
const { encrypt, decrypt } = require('../services/encryptionService');

class Partner {
  /**
   * Encrypt bank account fields before storing
   * @param {Object} data - Partner data with bank account fields
   * @returns {Object} Data with encrypted bank account fields
   */
  static encryptBankAccountFields(data) {
    const encrypted = { ...data };
    
    try {
      if (encrypted.bank_account_holder_name) {
        encrypted.bank_account_holder_name = encrypt(encrypted.bank_account_holder_name);
      }
      if (encrypted.bank_account_number) {
        encrypted.bank_account_number = encrypt(encrypted.bank_account_number);
      }
      if (encrypted.bank_ifsc_code) {
        encrypted.bank_ifsc_code = encrypt(encrypted.bank_ifsc_code);
      }
      if (encrypted.bank_name) {
        encrypted.bank_name = encrypt(encrypted.bank_name);
      }
    } catch (error) {
      console.error('Error encrypting bank account fields:', error);
      throw new Error('Failed to encrypt bank account details');
    }
    
    return encrypted;
  }

  /**
   * Decrypt bank account fields after retrieving from database
   * @param {Object} partner - Partner record from database
   * @returns {Object} Partner with decrypted bank account fields
   */
  static decryptBankAccountFields(partner) {
    if (!partner) return partner;
    
    const decrypted = { ...partner };
    
    // Decrypt each field individually to handle mixed encrypted/plain text data
    // (for backward compatibility during migration)
    if (decrypted.bank_account_holder_name) {
      try {
        decrypted.bank_account_holder_name = decrypt(decrypted.bank_account_holder_name);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        // Keep the original value
        console.warn(`Partner ${partner.id}: bank_account_holder_name appears to be plain text`);
      }
    }
    
    if (decrypted.bank_account_number) {
      try {
        decrypted.bank_account_number = decrypt(decrypted.bank_account_number);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Partner ${partner.id}: bank_account_number appears to be plain text`);
      }
    }
    
    if (decrypted.bank_ifsc_code) {
      try {
        decrypted.bank_ifsc_code = decrypt(decrypted.bank_ifsc_code);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Partner ${partner.id}: bank_ifsc_code appears to be plain text`);
      }
    }
    
    if (decrypted.bank_name) {
      try {
        decrypted.bank_name = decrypt(decrypted.bank_name);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Partner ${partner.id}: bank_name appears to be plain text`);
      }
    }
    
    return decrypted;
  }
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
    const { name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, organization_id, verification_token, verification_token_expires, fee_min, fee_max, fee_currency, language_preferences, video_sessions_enabled, query_resolver, referral_code_used, referral_discount_applied, referral_discount_type } = partnerData;

    // Generate unique Partner ID
    const partnerId = await this.generatePartnerId(organization_id);

    const query = `
      INSERT INTO partners (partner_id, name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, organization_id, verification_token, verification_token_expires, fee_min, fee_max, fee_currency, language_preferences, video_sessions_enabled, query_resolver, referral_code_used, referral_discount_applied, referral_discount_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;
    const values = [
      partnerId, name, sex, age || null, email, contact, qualification, license_id || null, address, photo_url,
      work_experience || null, other_practice_details || null, organization_id, verification_token, verification_token_expires,
      fee_min || null, fee_max || null, fee_currency || 'INR', language_preferences || null,
      video_sessions_enabled !== undefined ? video_sessions_enabled : true,
      query_resolver !== undefined ? query_resolver : false,
      referral_code_used || null,
      referral_discount_applied || null,
      referral_discount_type || null
    ];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM partners WHERE id = $1';
    const result = await db.query(query, [id]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  /**
   * Update Razorpay contact ID for a partner
   */
  static async updateRazorpayContactId(id, contactId, client = null) {
    const query = `
      UPDATE partners
      SET razorpay_contact_id = $1
      WHERE id = $2
      RETURNING *
    `;
    const dbClient = client || db;
    const result = await dbClient.query(query, [contactId, id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM partners WHERE email = $1';
    const result = await db.query(query, [email]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  static async findByPartnerId(partnerId) {
    const query = 'SELECT * FROM partners WHERE partner_id = $1';
    const result = await db.query(query, [partnerId]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  static async findByOrganization(organizationId) {
    const query = 'SELECT * FROM partners WHERE organization_id = $1';
    const result = await db.query(query, [organizationId]);
    return result.rows.map(row => this.decryptBankAccountFields(row));
  }

  static async update(id, partnerData) {
    const { name, sex, age, email, contact, qualification, license_id, address, photo_url, work_experience, other_practice_details, email_verified, default_report_template_id, default_report_background, fee_min, fee_max, fee_currency, session_fee, booking_fee, video_sessions_enabled, bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_name, bank_account_verified, query_resolver } = partnerData;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (sex !== undefined) {
      updates.push(`sex = $${paramIndex++}`);
      values.push(sex);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramIndex++}`);
      values.push(age);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (contact !== undefined) {
      updates.push(`contact = $${paramIndex++}`);
      values.push(contact);
    }
    if (qualification !== undefined) {
      updates.push(`qualification = $${paramIndex++}`);
      values.push(qualification);
    }
    if (license_id !== undefined) {
      updates.push(`license_id = $${paramIndex++}`);
      values.push(license_id);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(photo_url);
    }
    if (work_experience !== undefined) {
      updates.push(`work_experience = $${paramIndex++}`);
      values.push(work_experience);
    }
    if (other_practice_details !== undefined) {
      updates.push(`other_practice_details = $${paramIndex++}`);
      values.push(other_practice_details);
    }
    if (email_verified !== undefined) {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(email_verified);
    }
    if (default_report_template_id !== undefined) {
      updates.push(`default_report_template_id = $${paramIndex++}`);
      values.push(default_report_template_id);
    }
    if (default_report_background !== undefined) {
      updates.push(`default_report_background = $${paramIndex++}`);
      values.push(default_report_background);
    }
    if (fee_min !== undefined) {
      updates.push(`fee_min = $${paramIndex++}`);
      values.push(fee_min);
    }
    if (fee_max !== undefined) {
      updates.push(`fee_max = $${paramIndex++}`);
      values.push(fee_max);
    }
    if (fee_currency !== undefined) {
      updates.push(`fee_currency = $${paramIndex++}`);
      values.push(fee_currency);
    }
    if (session_fee !== undefined) {
      updates.push(`session_fee = $${paramIndex++}`);
      values.push(session_fee);
    }
    if (booking_fee !== undefined) {
      updates.push(`booking_fee = $${paramIndex++}`);
      values.push(booking_fee);
    }
    if (video_sessions_enabled !== undefined) {
      updates.push(`video_sessions_enabled = $${paramIndex++}`);
      values.push(video_sessions_enabled);
    }
    if (query_resolver !== undefined) {
      updates.push(`query_resolver = $${paramIndex++}`);
      values.push(query_resolver);
    }
    
    // Bank account fields - encrypt before storing
    let bankDetailsChanged = false;
    if (bank_account_holder_name !== undefined) {
      const encrypted = bank_account_holder_name ? encrypt(bank_account_holder_name) : null;
      updates.push(`bank_account_holder_name = $${paramIndex++}`);
      values.push(encrypted);
      bankDetailsChanged = true;
    }
    if (bank_account_number !== undefined) {
      const encrypted = bank_account_number ? encrypt(bank_account_number) : null;
      updates.push(`bank_account_number = $${paramIndex++}`);
      values.push(encrypted);
      bankDetailsChanged = true;
    }
    if (bank_ifsc_code !== undefined) {
      const encrypted = bank_ifsc_code ? encrypt(bank_ifsc_code) : null;
      updates.push(`bank_ifsc_code = $${paramIndex++}`);
      values.push(encrypted);
      bankDetailsChanged = true;
    }
    // Reset verification when bank details change
    if (bankDetailsChanged) {
      updates.push(`bank_account_verified = FALSE`);
      updates.push(`bank_account_verified_at = NULL`);
    }
    if (bank_name !== undefined) {
      const encrypted = bank_name ? encrypt(bank_name) : null;
      updates.push(`bank_name = $${paramIndex++}`);
      values.push(encrypted);
    }
    // Only allow explicit bank_account_verified update if bank details haven't changed
    // (to avoid duplicate assignment error)
    if (bank_account_verified !== undefined && !bankDetailsChanged) {
      updates.push(`bank_account_verified = $${paramIndex++}`);
      values.push(bank_account_verified);
      if (bank_account_verified === true) {
        updates.push(`bank_account_verified_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`bank_account_verified_at = NULL`);
      }
    }

    if (updates.length === 0) {
      // No fields to update, just return the current record
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE partners
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
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

  /**
   * Update fee settings for a partner
   * @param {number} partnerId - Partner ID
   * @param {Object} feeData - Fee data { session_fee, booking_fee, fee_currency }
   * @returns {Promise<Object>} Updated partner record
   */
  static async updateFeeSettings(partnerId, feeData) {
    const { session_fee, booking_fee, fee_currency } = feeData;
    const query = `
      UPDATE partners
      SET session_fee = $2,
          booking_fee = $3,
          fee_currency = COALESCE($4, fee_currency)
      WHERE id = $1
      RETURNING id, name, session_fee, booking_fee, fee_currency
    `;
    const result = await db.query(query, [
      partnerId,
      session_fee !== undefined ? session_fee : null,
      booking_fee !== undefined ? booking_fee : null,
      fee_currency || 'INR'
    ]);
    return result.rows[0];
  }

  /**
   * Get fee settings for a partner
   * @param {number} partnerId - Partner ID
   * @returns {Promise<Object>} Partner fee settings
   */
  static async getFeeSettings(partnerId) {
    const query = `
      SELECT id, name, session_fee, booking_fee, fee_currency
      FROM partners
      WHERE id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows[0];
  }
}

module.exports = Partner;

