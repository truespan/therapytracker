const db = require('../config/database');
const { encrypt, decrypt } = require('../services/encryptionService');

class Organization {
  /**
   * Encrypt bank account fields before storing
   * @param {Object} data - Organization data with bank account fields
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
   * @param {Object} organization - Organization record from database
   * @returns {Object} Organization with decrypted bank account fields
   */
  static decryptBankAccountFields(organization) {
    if (!organization) return organization;
    
    const decrypted = { ...organization };
    
    // Decrypt each field individually to handle mixed encrypted/plain text data
    // (for backward compatibility during migration)
    if (decrypted.bank_account_holder_name) {
      try {
        decrypted.bank_account_holder_name = decrypt(decrypted.bank_account_holder_name);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        // Keep the original value
        console.warn(`Organization ${organization.id}: bank_account_holder_name appears to be plain text`);
      }
    }
    
    if (decrypted.bank_account_number) {
      try {
        decrypted.bank_account_number = decrypt(decrypted.bank_account_number);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Organization ${organization.id}: bank_account_number appears to be plain text`);
      }
    }
    
    if (decrypted.bank_ifsc_code) {
      try {
        decrypted.bank_ifsc_code = decrypt(decrypted.bank_ifsc_code);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Organization ${organization.id}: bank_ifsc_code appears to be plain text`);
      }
    }
    
    if (decrypted.bank_name) {
      try {
        decrypted.bank_name = decrypt(decrypted.bank_name);
      } catch (error) {
        // If decryption fails, assume it's plain text (backward compatibility)
        console.warn(`Organization ${organization.id}: bank_name appears to be plain text`);
      }
    }
    
    return decrypted;
  }
  static async create(orgData, client = null) {
    const { 
      name, date_of_creation, email, contact, address, photo_url, gst_no, subscription_plan, 
      video_sessions_enabled, theraptrack_controlled, number_of_therapists, 
      subscription_plan_id, subscription_billing_period, subscription_start_date, subscription_end_date,
      query_resolver, referral_code, referral_code_discount, referral_code_discount_type,
      hide_therapists_tab, hide_questionnaires_tab, disable_therapist_plan_change
    } = orgData;
    
    // Validate referral code can only be set for theraptrack_controlled organizations
    if (referral_code && !theraptrack_controlled) {
      throw new Error('Referral codes can only be set for TheraPTrack-controlled organizations');
    }
    
    // Validate discount type if discount is provided
    if (referral_code_discount !== undefined && referral_code_discount !== null) {
      if (!referral_code_discount_type || !['percentage', 'fixed'].includes(referral_code_discount_type)) {
        throw new Error('Discount type must be either "percentage" or "fixed" when discount is set');
      }
      if (referral_code_discount < 0) {
        throw new Error('Discount amount must be greater than or equal to 0');
      }
      if (referral_code_discount_type === 'percentage' && referral_code_discount > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
    }
    
    const query = `
      INSERT INTO organizations (
        name, date_of_creation, email, contact, address, photo_url, gst_no, subscription_plan, 
        is_active, video_sessions_enabled, theraptrack_controlled, number_of_therapists,
        subscription_plan_id, subscription_billing_period, subscription_start_date, subscription_end_date,
        query_resolver, referral_code, referral_code_discount, referral_code_discount_type,
        hide_therapists_tab, hide_questionnaires_tab, disable_therapist_plan_change
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `;
    const values = [
      name,
      date_of_creation || new Date(),
      email,
      contact,
      address,
      photo_url,
      gst_no || null,
      subscription_plan || null,
      true,
      video_sessions_enabled !== undefined ? video_sessions_enabled : true,
      theraptrack_controlled !== undefined ? theraptrack_controlled : false,
      number_of_therapists || null,
      subscription_plan_id || null,
      subscription_billing_period || null,
      subscription_start_date || null,
      subscription_end_date || null,
      query_resolver !== undefined ? query_resolver : false,
      referral_code ? referral_code.toUpperCase() : null,
      referral_code_discount || null,
      referral_code_discount_type || null,
      hide_therapists_tab !== undefined ? hide_therapists_tab : false,
      hide_questionnaires_tab !== undefined ? hide_questionnaires_tab : false,
      disable_therapist_plan_change !== undefined ? disable_therapist_plan_change : false
    ];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id, client = null) {
    const query = 'SELECT * FROM organizations WHERE id = $1';
    const dbClient = client || db;
    const result = await dbClient.query(query, [id]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM organizations WHERE email = $1';
    const result = await db.query(query, [email]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  /**
   * Find organization by referral code (case-insensitive)
   * @param {string} referralCode - The referral code to look up
   * @returns {Promise<Object|null>} Organization with discount info or null
   */
  static async findByReferralCode(referralCode) {
    if (!referralCode) {
      return null;
    }
    const query = `
      SELECT * FROM organizations 
      WHERE UPPER(referral_code) = UPPER($1) 
        AND theraptrack_controlled = TRUE
    `;
    const result = await db.query(query, [referralCode]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  static async getAll() {
    const query = 'SELECT id, name, email, contact, address, photo_url, gst_no, subscription_plan, is_active, video_sessions_enabled, theraptrack_controlled, number_of_therapists, referral_code, referral_code_discount, referral_code_discount_type, hide_therapists_tab, hide_questionnaires_tab, disable_therapist_plan_change, created_at FROM organizations ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  static async update(id, orgData, client = null) {
    const { 
      name, email, contact, address, photo_url, gst_no, subscription_plan, video_sessions_enabled,
      theraptrack_controlled, number_of_therapists, subscription_plan_id, 
      subscription_billing_period, subscription_start_date, subscription_end_date,
      razorpay_subscription_id, razorpay_customer_id, payment_status,
      bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_name, bank_account_verified,
      query_resolver, referral_code, referral_code_discount, referral_code_discount_type,
      for_new_therapists, hide_therapists_tab, hide_questionnaires_tab, disable_therapist_plan_change
    } = orgData;

    console.log('Organization.update called with:', { id, orgData, address, addressType: typeof address, addressUndefined: address === undefined });

    // Get current organization to check theraptrack_controlled status
    const currentOrg = await this.findById(id, client);
    if (!currentOrg) {
      throw new Error('Organization not found');
    }

    // Validate referral code can only be set for theraptrack_controlled organizations
    if (referral_code !== undefined && referral_code !== null) {
      const isControlled = theraptrack_controlled !== undefined ? theraptrack_controlled : currentOrg.theraptrack_controlled;
      if (!isControlled) {
        throw new Error('Referral codes can only be set for TheraPTrack-controlled organizations');
      }
    }

    // Validate discount type if discount is provided
    if (referral_code_discount !== undefined && referral_code_discount !== null) {
      if (!referral_code_discount_type || !['percentage', 'fixed'].includes(referral_code_discount_type)) {
        throw new Error('Discount type must be either "percentage" or "fixed" when discount is set');
      }
      if (referral_code_discount < 0) {
        throw new Error('Discount amount must be greater than or equal to 0');
      }
      if (referral_code_discount_type === 'percentage' && referral_code_discount > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
    }

    // Handle for_new_therapists flag - ensure only one organization can have it set to true
    if (for_new_therapists !== undefined) {
      const isControlled = theraptrack_controlled !== undefined ? theraptrack_controlled : currentOrg.theraptrack_controlled;
      if (for_new_therapists === true && !isControlled) {
        throw new Error('Only TheraPTrack-controlled organizations can be set as "For New Therapists"');
      }

      // If setting to true, first unset all other organizations
      if (for_new_therapists === true) {
        const dbClient = client || db;
        await dbClient.query(
          'UPDATE organizations SET for_new_therapists = false WHERE for_new_therapists = true AND id != $1',
          [id]
        );
      }
    }

    // Build dynamic update query to handle undefined vs explicit values
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (contact !== undefined) {
      updates.push(`contact = $${paramIndex++}`);
      values.push(contact);
    }
    if (address !== undefined) {
      console.log('Adding address to update:', address);
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    } else {
      console.log('Address is undefined, not including in update');
    }
    if (photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(photo_url);
    }
    if (gst_no !== undefined) {
      updates.push(`gst_no = $${paramIndex++}`);
      values.push(gst_no);
    }
    if (subscription_plan !== undefined) {
      updates.push(`subscription_plan = $${paramIndex++}`);
      values.push(subscription_plan);
    }
    if (video_sessions_enabled !== undefined) {
      updates.push(`video_sessions_enabled = $${paramIndex++}`);
      values.push(video_sessions_enabled);
    }
    if (theraptrack_controlled !== undefined) {
      updates.push(`theraptrack_controlled = $${paramIndex++}`);
      values.push(theraptrack_controlled);
    }
    if (query_resolver !== undefined) {
      updates.push(`query_resolver = $${paramIndex++}`);
      values.push(query_resolver);
    }
    if (referral_code !== undefined) {
      updates.push(`referral_code = $${paramIndex++}`);
      values.push(referral_code ? referral_code.toUpperCase() : null);
    }
    if (referral_code_discount !== undefined) {
      updates.push(`referral_code_discount = $${paramIndex++}`);
      values.push(referral_code_discount);
    }
    if (referral_code_discount_type !== undefined) {
      updates.push(`referral_code_discount_type = $${paramIndex++}`);
      values.push(referral_code_discount_type);
    }
    if (for_new_therapists !== undefined) {
      updates.push(`for_new_therapists = $${paramIndex++}`);
      values.push(for_new_therapists);
    }
    if (hide_therapists_tab !== undefined) {
      updates.push(`hide_therapists_tab = $${paramIndex++}`);
      values.push(hide_therapists_tab);
    }
    if (hide_questionnaires_tab !== undefined) {
      updates.push(`hide_questionnaires_tab = $${paramIndex++}`);
      values.push(hide_questionnaires_tab);
    }
    if (disable_therapist_plan_change !== undefined) {
      updates.push(`disable_therapist_plan_change = $${paramIndex++}`);
      values.push(disable_therapist_plan_change);
    }
    if (number_of_therapists !== undefined) {
      // Convert empty string to null for integer field
      const therapistsValue = (number_of_therapists === '' || number_of_therapists === null) 
        ? null 
        : parseInt(number_of_therapists, 10);
      updates.push(`number_of_therapists = $${paramIndex++}`);
      values.push(therapistsValue);
    }
    if (subscription_plan_id !== undefined) {
      updates.push(`subscription_plan_id = $${paramIndex++}`);
      values.push(subscription_plan_id);
    }
    if (subscription_billing_period !== undefined) {
      updates.push(`subscription_billing_period = $${paramIndex++}`);
      values.push(subscription_billing_period);
    }
    if (subscription_start_date !== undefined) {
      updates.push(`subscription_start_date = $${paramIndex++}`);
      values.push(subscription_start_date);
    }
    if (subscription_end_date !== undefined) {
      updates.push(`subscription_end_date = $${paramIndex++}`);
      values.push(subscription_end_date);
    }
    if (razorpay_subscription_id !== undefined) {
      updates.push(`razorpay_subscription_id = $${paramIndex++}`);
      values.push(razorpay_subscription_id);
    }
    if (razorpay_customer_id !== undefined) {
      updates.push(`razorpay_customer_id = $${paramIndex++}`);
      values.push(razorpay_customer_id);
    }
    if (payment_status !== undefined) {
      updates.push(`payment_status = $${paramIndex++}`);
      values.push(payment_status);
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
      UPDATE organizations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('Executing update query:', query);
    console.log('Query values:', values);

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    console.log('Update result:', result.rows[0]);
    if (result.rows[0]) {
      return this.decryptBankAccountFields(result.rows[0]);
    }
    return null;
  }

  static async delete(id) {
    const query = 'DELETE FROM organizations WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getPartners(orgId) {
    // Ensure last_login column exists in auth_credentials table
    try {
      await db.query(`
        ALTER TABLE auth_credentials 
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
      `);
    } catch (error) {
      // Column might already exist or there's a permission issue, continue anyway
      console.log('Note: Could not ensure last_login column exists:', error.message);
    }

    // Ensure first_login column exists in auth_credentials table
    try {
      await db.query(`
        ALTER TABLE auth_credentials 
        ADD COLUMN IF NOT EXISTS first_login TIMESTAMP
      `);
    } catch (error) {
      // Column might already exist or there's a permission issue, continue anyway
      console.log('Note: Could not ensure first_login column exists:', error.message);
    }

    // Ensure subscription_plan_events table exists (for backward compatibility)
    try {
      await db.query(`
        SELECT 1 FROM subscription_plan_events LIMIT 1
      `);
    } catch (error) {
      // Table doesn't exist yet, that's okay - will return NULLs for event fields
      console.log('Note: subscription_plan_events table does not exist yet:', error.message);
    }

    const query = `
      SELECT 
        p.*,
        MAX(ts.created_at) as last_session_date,
        ac.last_login,
        ac.first_login,
        p.is_active,
        p.email_verified,
        -- Subscription plan event data
        MAX(spe1.event_timestamp) FILTER (WHERE spe1.event_type = 'modal_shown') as modal_shown_at,
        BOOL_OR(spe1.is_first_login) FILTER (WHERE spe1.event_type = 'modal_shown') as is_first_login,
        MAX(spe2.event_timestamp) FILTER (WHERE spe2.event_type = 'payment_attempted') as payment_attempted_at,
        MAX(spe3.event_timestamp) FILTER (WHERE spe3.event_type = 'payment_completed') as payment_completed_at
      FROM partners p
      LEFT JOIN therapy_sessions ts ON p.id = ts.partner_id
      LEFT JOIN auth_credentials ac ON ac.user_type = 'partner' AND ac.reference_id = p.id
      LEFT JOIN subscription_plan_events spe1 ON spe1.user_type = 'partner' AND spe1.user_id = p.id AND spe1.event_type = 'modal_shown'
      LEFT JOIN subscription_plan_events spe2 ON spe2.user_type = 'partner' AND spe2.user_id = p.id AND spe2.event_type = 'payment_attempted'
      LEFT JOIN subscription_plan_events spe3 ON spe3.user_type = 'partner' AND spe3.user_id = p.id AND spe3.event_type = 'payment_completed'
      WHERE p.organization_id = $1
      GROUP BY p.id, ac.last_login, ac.first_login, p.is_active, p.email_verified
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  static async getAllUsers(orgId) {
    const query = `
      SELECT DISTINCT u.* FROM users u
      JOIN user_partner_assignments upa ON u.id = upa.user_id
      JOIN partners p ON upa.partner_id = p.id
      WHERE p.organization_id = $1
    `;
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  /**
   * Cancel organization subscription (marks as cancelled, retains access until end date)
   * @param {number} id - Organization ID
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Updated organization with cancellation
   */
  static async cancelSubscription(id, client = null) {
    const query = `
      UPDATE organizations
      SET is_cancelled = TRUE,
          cancellation_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const dbClient = client || db;
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get active subscription details for an organization
   * @param {number} id - Organization ID
   * @returns {Promise<Object|null>} Organization with subscription details
   */
  static async getActiveSubscription(id) {
    // First get the organization to check if it's TheraPTrack controlled
    const orgQuery = `SELECT theraptrack_controlled FROM organizations WHERE id = $1`;
    const orgResult = await db.query(orgQuery, [id]);
    const isTheraPTrackControlled = orgResult.rows[0]?.theraptrack_controlled === true;
    
    // For TheraPTrack controlled organizations, return a subscription object with all features enabled
    // even if they don't have a subscription plan assigned
    if (isTheraPTrackControlled) {
      const orgQuery = `
        SELECT o.*,
               sp.plan_name,
               sp.min_sessions,
               sp.max_sessions,
               sp.has_video,
               sp.has_whatsapp,
               sp.has_advanced_assessments,
               sp.has_report_generation,
               sp.has_custom_branding,
               sp.has_advanced_analytics,
               sp.has_blogs_events_announcements,
               sp.has_customized_feature_support,
               sp.has_priority_support,
               sp.has_email_support,
               sp.organization_monthly_price,
               sp.organization_quarterly_price,
               sp.organization_yearly_price
        FROM organizations o
        LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
        WHERE o.id = $1
      `;
      const result = await db.query(orgQuery, [id]);
      const subscription = result.rows[0] || null;
      
      if (subscription) {
        // Ensure all features are enabled for TheraPTrack controlled organizations
        subscription.has_video = true;
        subscription.has_whatsapp = true;
        subscription.has_advanced_assessments = true;
        subscription.has_report_generation = true;
        subscription.has_custom_branding = true;
        subscription.has_advanced_analytics = true;
        subscription.has_blogs_events_announcements = true;
        subscription.has_customized_feature_support = true;
        subscription.has_priority_support = true;
        subscription.has_email_support = true;
        // Ensure subscription is always considered active
        subscription.subscription_end_date = null;
        subscription.is_cancelled = false;
      }
      
      return subscription;
    }
    
    // For non-TheraPTrack controlled organizations, use the original logic
    const query = `
      SELECT o.*,
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video,
             sp.has_whatsapp,
             sp.has_advanced_assessments,
             sp.has_report_generation,
             sp.has_custom_branding,
             sp.has_advanced_analytics,
             sp.has_blogs_events_announcements,
             sp.has_customized_feature_support,
             sp.has_priority_support,
             sp.has_email_support,
             sp.organization_monthly_price,
             sp.organization_quarterly_price,
             sp.organization_yearly_price
      FROM organizations o
      LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
      WHERE o.id = $1
        AND (o.subscription_end_date IS NULL OR o.subscription_end_date > CURRENT_TIMESTAMP)
        AND (o.is_cancelled = FALSE OR o.is_cancelled IS NULL)
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if organization subscription is active
   * TheraPTrack controlled organizations are always considered active
   * @param {Object} organization - Organization object
   * @returns {boolean} Whether subscription is active
   */
  static isSubscriptionActive(organization) {
    if (!organization) return false;
    
    // TheraPTrack controlled organizations are always considered active
    if (organization.theraptrack_controlled === true) {
      return true;
    }
    
    if (!organization.subscription_plan_id) return false;
    
    const now = new Date();
    const endDate = organization.subscription_end_date ? new Date(organization.subscription_end_date) : null;
    
    // If cancelled, check if still within active period
    if (organization.is_cancelled) {
      return endDate && endDate > now;
    }
    
    // Not cancelled, check if not expired
    return !endDate || endDate > now;
  }

  /**
   * Deactivate an organization
   * @param {number} id - Organization ID
   * @param {number} adminId - Admin ID who is deactivating
   * @returns {Object} Updated organization record
   */
  static async deactivate(id, adminId) {
    const query = `
      UPDATE organizations 
      SET is_active = FALSE,
          deactivated_at = CURRENT_TIMESTAMP,
          deactivated_by = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, adminId]);
    return result.rows[0];
  }

  /**
   * Activate an organization
   * @param {number} id - Organization ID
   * @returns {Object} Updated organization record
   */
  static async activate(id) {
    const query = `
      UPDATE organizations 
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
   * Get metrics for a specific organization
   * @param {number} id - Organization ID
   * @returns {Object} Organization metrics
   */
  static async getMetrics(id) {
    const query = `
      WITH partner_count AS (
        SELECT COUNT(*)::int as total_partners
        FROM partners
        WHERE organization_id = $1
      ),
      client_count AS (
        SELECT COUNT(DISTINCT u.id)::int as total_clients
        FROM users u
        JOIN user_partner_assignments upa ON u.id = upa.user_id
        JOIN partners p ON upa.partner_id = p.id
        WHERE p.organization_id = $1
      ),
      session_stats AS (
        SELECT
          COUNT(*)::int as total_sessions,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_sessions,
          COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress'))::int as active_sessions,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM video_sessions vs
        JOIN partners p ON vs.partner_id = p.id
        WHERE p.organization_id = $1
      )
      SELECT
        pc.total_partners,
        cc.total_clients,
        ss.total_sessions,
        ss.completed_sessions,
        ss.active_sessions,
        ss.sessions_this_month
      FROM partner_count pc, client_count cc, session_stats ss
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || {
      total_partners: 0,
      total_clients: 0,
      total_sessions: 0,
      completed_sessions: 0,
      active_sessions: 0,
      sessions_this_month: 0
    };
  }

  /**
   * Get all organizations with their metrics
   * @returns {Array} Array of organizations with metrics
   */
  static async getAllWithMetrics() {
    const query = `
      WITH org_metrics AS (
        SELECT
          o.id,
          o.name,
          o.email,
          o.contact,
          o.address,
          o.gst_no,
          o.subscription_plan,
          o.is_active,
          o.video_sessions_enabled,
          o.theraptrack_controlled,
          o.for_new_therapists,
          o.number_of_therapists,
          o.deactivated_at,
          o.deactivated_by,
          o.created_at,
          o.referral_code,
          o.referral_code_discount,
          o.referral_code_discount_type,
          o.hide_therapists_tab,
          o.hide_questionnaires_tab,
          o.disable_therapist_plan_change,
          COUNT(DISTINCT p.id)::int as total_partners,
          COUNT(DISTINCT u.id)::int as total_clients,
          COUNT(DISTINCT vs.id)::int as total_sessions,
          COUNT(DISTINCT vs.id) FILTER (WHERE vs.status = 'completed')::int as completed_sessions,
          COUNT(DISTINCT vs.id) FILTER (WHERE vs.status IN ('scheduled', 'in_progress'))::int as active_sessions,
          COUNT(DISTINCT vs.id) FILTER (WHERE DATE_TRUNC('month', vs.session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM organizations o
        LEFT JOIN partners p ON o.id = p.organization_id
        LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
        LEFT JOIN users u ON upa.user_id = u.id
        LEFT JOIN video_sessions vs ON p.id = vs.partner_id
        GROUP BY o.id, o.name, o.email, o.contact, o.address, o.gst_no,
                 o.subscription_plan, o.is_active, o.video_sessions_enabled, o.theraptrack_controlled,
                 o.for_new_therapists, o.number_of_therapists, o.deactivated_at, o.deactivated_by, o.created_at,
                 o.referral_code, o.referral_code_discount, o.referral_code_discount_type,
                 o.hide_therapists_tab, o.hide_questionnaires_tab, o.disable_therapist_plan_change
      )
      SELECT
        om.*,
        a.name as deactivated_by_name
      FROM org_metrics om
      LEFT JOIN admins a ON om.deactivated_by = a.id
      ORDER BY om.name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get partner breakdown for organization
   * @param {number} id - Organization ID
   * @returns {Array} Partner statistics
   */
  static async getPartnerBreakdown(id) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.partner_id,
        p.email,
        COUNT(DISTINCT upa.user_id)::int as total_clients,
        COUNT(DISTINCT vs.id)::int as total_sessions,
        COUNT(DISTINCT vs.id) FILTER (WHERE vs.status = 'completed')::int as completed_sessions,
        COUNT(DISTINCT vs.id) FILTER (WHERE DATE_TRUNC('month', vs.session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
      FROM partners p
      LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
      LEFT JOIN video_sessions vs ON p.id = vs.partner_id
      WHERE p.organization_id = $1
      GROUP BY p.id, p.name, p.partner_id, p.email
      ORDER BY p.name
    `;
    const result = await db.query(query, [id]);
    return result.rows;
  }

  /**
   * Check if video sessions are enabled for an organization
   * @param {number} organizationId - Organization ID
   * @returns {Promise<boolean>} Whether video sessions are enabled
   */
  static async areVideoSessionsEnabled(organizationId) {
    const query = `
      SELECT video_sessions_enabled
      FROM organizations
      WHERE id = $1
    `;
    const result = await db.query(query, [organizationId]);
    return result.rows[0]?.video_sessions_enabled ?? false;
  }

  /**
   * Check if video sessions are enabled for a partner's organization
   * @param {number} partnerId - Partner ID
   * @returns {Promise<boolean>} Whether video sessions are enabled
   */
  static async areVideoSessionsEnabledForPartner(partnerId) {
    const query = `
      SELECT o.video_sessions_enabled
      FROM organizations o
      JOIN partners p ON p.organization_id = o.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows[0]?.video_sessions_enabled ?? false;
  }

  /**
   * Get subscription details for an organization including plan information
   * @param {number} id - Organization ID
   * @returns {Promise<Object>} Organization with subscription plan details
   */
  static async getSubscriptionDetails(id) {
    const query = `
      SELECT 
        o.*,
        sp.plan_name,
        sp.min_sessions,
        sp.max_sessions,
        sp.has_video,
        sp.individual_yearly_price,
        sp.individual_quarterly_price,
        sp.individual_monthly_price,
        sp.organization_yearly_price,
        sp.organization_quarterly_price,
        sp.organization_monthly_price
      FROM organizations o
      LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
      WHERE o.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Check if organization is TheraPTrack controlled
   * @param {number} id - Organization ID
   * @returns {Promise<boolean>} Whether organization is TheraPTrack controlled
   */
  static async isTheraPTrackControlled(id) {
    const query = `
      SELECT theraptrack_controlled
      FROM organizations
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0]?.theraptrack_controlled ?? false;
  }

  /**
   * Get or create a signup token for therapist self-registration
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Object>} Token object with token string and URL
   */
  static async getOrCreateSignupToken(organizationId) {
    const crypto = require('crypto');

    // Check if there's already an active token
    const existingQuery = `
      SELECT token, created_at
      FROM organization_signup_tokens
      WHERE organization_id = $1 AND is_active = TRUE
      LIMIT 1
    `;
    const existingResult = await db.query(existingQuery, [organizationId]);

    if (existingResult.rows.length > 0) {
      return {
        token: existingResult.rows[0].token,
        created_at: existingResult.rows[0].created_at,
        is_new: false
      };
    }

    // Generate a new token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Create the token
    const insertQuery = `
      INSERT INTO organization_signup_tokens (organization_id, token, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING token, created_at
    `;
    const insertResult = await db.query(insertQuery, [organizationId, token]);

    return {
      token: insertResult.rows[0].token,
      created_at: insertResult.rows[0].created_at,
      is_new: true
    };
  }

  /**
   * Verify a signup token and get organization details
   * @param {string} token - Signup token
   * @returns {Promise<Object|null>} Organization details if token is valid, null otherwise
   */
  static async verifySignupToken(token) {
    const query = `
      SELECT o.id, o.name, o.theraptrack_controlled
      FROM organization_signup_tokens ost
      JOIN organizations o ON ost.organization_id = o.id
      WHERE ost.token = $1
        AND ost.is_active = TRUE
        AND o.theraptrack_controlled = TRUE
    `;
    const result = await db.query(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Deactivate a signup token
   * @param {number} organizationId - Organization ID
   * @returns {Promise<boolean>} Success status
   */
  static async deactivateSignupToken(organizationId) {
    const query = `
      UPDATE organization_signup_tokens
      SET is_active = FALSE
      WHERE organization_id = $1 AND is_active = TRUE
    `;
    await db.query(query, [organizationId]);
    return true;
  }

  /**
   * Update Razorpay contact ID for an organization
   */
  static async updateRazorpayContactId(id, contactId, client = null) {
    const query = `
      UPDATE organizations
      SET razorpay_contact_id = $1
      WHERE id = $2
      RETURNING *
    `;
    const dbClient = client || db;
    const result = await dbClient.query(query, [contactId, id]);
    return result.rows[0];
  }

  /**
   * Set the for_new_therapists flag for an organization
   * Only one organization can have this flag set to true at a time
   * Only organizations with theraptrack_controlled = true can have this flag
   * @param {number} organizationId - Organization ID
   * @param {boolean} value - True to set, false to unset
   * @returns {Object} Updated organization
   */
  static async setForNewTherapists(organizationId, value) {
    try {
      // First, verify the organization exists and has theraptrack_controlled = true
      const org = await this.findById(organizationId);
      
      if (!org) {
        throw new Error('Organization not found');
      }

      if (value === true && !org.theraptrack_controlled) {
        throw new Error('Only TheraPTrack-controlled organizations can be set as "For New Therapists"');
      }

      // If setting to true, first unset all other organizations
      if (value === true) {
        await db.query(
          'UPDATE organizations SET for_new_therapists = false WHERE for_new_therapists = true'
        );
      }

      // Now update the target organization
      const result = await db.query(
        `UPDATE organizations 
         SET for_new_therapists = $1 
         WHERE id = $2 
         RETURNING *`,
        [value, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to update organization');
      }

      return this.decryptBankAccountFields(result.rows[0]);
    } catch (error) {
      console.error('Error setting for_new_therapists flag:', error);
      throw error;
    }
  }

  /**
   * Get the organization designated for new therapist signups
   * @returns {Object|null} Organization with for_new_therapists = true, or null
   */
  static async getForNewTherapists() {
    try {
      const result = await db.query(
        `SELECT * FROM organizations 
         WHERE for_new_therapists = true 
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.decryptBankAccountFields(result.rows[0]);
    } catch (error) {
      console.error('Error getting for_new_therapists organization:', error);
      throw error;
    }
  }
}

module.exports = Organization;

