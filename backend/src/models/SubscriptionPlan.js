const db = require('../config/database');

class SubscriptionPlan {
  static async create(planData, client = null) {
    const {
      plan_name,
      plan_type,
      min_sessions,
      max_sessions,
      max_appointments,
      has_video,
      has_whatsapp,
      has_advanced_assessments,
      has_report_generation,
      has_custom_branding,
      has_advanced_analytics,
      has_blogs_events_announcements,
      has_customized_feature_support,
      has_priority_support,
      has_email_support,
      min_therapists,
      max_therapists,
      plan_order,
      plan_duration_days,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active,
      individual_yearly_enabled,
      individual_quarterly_enabled,
      individual_monthly_enabled,
      organization_yearly_enabled,
      organization_quarterly_enabled,
      organization_monthly_enabled
    } = planData;

    const query = `
      INSERT INTO subscription_plans (
        plan_name, plan_type, min_sessions, max_sessions, max_appointments, has_video,
        has_whatsapp, has_advanced_assessments, has_report_generation,
        has_custom_branding, has_advanced_analytics, has_blogs_events_announcements, has_customized_feature_support,
        has_priority_support, has_email_support,
        min_therapists, max_therapists, plan_order, plan_duration_days,
        individual_yearly_price, individual_quarterly_price, individual_monthly_price,
        organization_yearly_price, organization_quarterly_price, organization_monthly_price,
        is_active,
        individual_yearly_enabled, individual_quarterly_enabled, individual_monthly_enabled,
        organization_yearly_enabled, organization_quarterly_enabled, organization_monthly_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
      RETURNING *
    `;

    const values = [
      plan_name,
      plan_type || 'individual',
      min_sessions,
      max_sessions !== undefined ? max_sessions : null,
      max_appointments !== undefined ? max_appointments : null,
      has_video !== undefined ? has_video : false,
      has_whatsapp !== undefined ? has_whatsapp : false,
      has_advanced_assessments !== undefined ? has_advanced_assessments : false,
      has_report_generation !== undefined ? has_report_generation : false,
      has_custom_branding !== undefined ? has_custom_branding : false,
      has_advanced_analytics !== undefined ? has_advanced_analytics : false,
      has_blogs_events_announcements !== undefined ? has_blogs_events_announcements : false,
      has_customized_feature_support !== undefined ? has_customized_feature_support : false,
      has_priority_support !== undefined ? has_priority_support : false,
      has_email_support !== undefined ? has_email_support : false,
      min_therapists || null,
      max_therapists || null,
      plan_order !== undefined ? plan_order : 0,
      plan_duration_days !== undefined ? plan_duration_days : null,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active !== undefined ? is_active : true,
      individual_yearly_enabled !== undefined ? individual_yearly_enabled : true,
      individual_quarterly_enabled !== undefined ? individual_quarterly_enabled : true,
      individual_monthly_enabled !== undefined ? individual_monthly_enabled : true,
      organization_yearly_enabled !== undefined ? organization_yearly_enabled : true,
      organization_quarterly_enabled !== undefined ? organization_quarterly_enabled : true,
      organization_monthly_enabled !== undefined ? organization_monthly_enabled : true
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM subscription_plans WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM subscription_plans ORDER BY plan_name, min_sessions';
    const result = await db.query(query);
    return result.rows;
  }

  static async getActive() {
    const query = 'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY plan_name, min_sessions';
    const result = await db.query(query);
    return result.rows;
  }

  static async update(id, planData) {
    const {
      plan_name,
      plan_type,
      min_sessions,
      max_sessions,
      max_appointments,
      has_video,
      has_whatsapp,
      has_advanced_assessments,
      has_report_generation,
      has_custom_branding,
      has_advanced_analytics,
      has_blogs_events_announcements,
      has_customized_feature_support,
      has_priority_support,
      has_email_support,
      min_therapists,
      max_therapists,
      plan_order,
      plan_duration_days,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active,
      individual_yearly_enabled,
      individual_quarterly_enabled,
      individual_monthly_enabled,
      organization_yearly_enabled,
      organization_quarterly_enabled,
      organization_monthly_enabled
    } = planData;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (plan_name !== undefined) {
      updates.push(`plan_name = $${paramIndex++}`);
      values.push(plan_name);
    }
    if (plan_type !== undefined) {
      updates.push(`plan_type = $${paramIndex++}`);
      values.push(plan_type);
    }
    if (min_sessions !== undefined) {
      updates.push(`min_sessions = $${paramIndex++}`);
      values.push(min_sessions);
    }
    if (max_sessions !== undefined) {
      updates.push(`max_sessions = $${paramIndex++}`);
      values.push(max_sessions === null ? null : max_sessions);
    }
    if (max_appointments !== undefined) {
      updates.push(`max_appointments = $${paramIndex++}`);
      values.push(max_appointments === null ? null : max_appointments);
    }
    if (has_video !== undefined) {
      updates.push(`has_video = $${paramIndex++}`);
      values.push(has_video);
    }
    if (has_whatsapp !== undefined) {
      updates.push(`has_whatsapp = $${paramIndex++}`);
      values.push(has_whatsapp);
    }
    if (has_advanced_assessments !== undefined) {
      updates.push(`has_advanced_assessments = $${paramIndex++}`);
      values.push(has_advanced_assessments);
    }
    if (has_report_generation !== undefined) {
      updates.push(`has_report_generation = $${paramIndex++}`);
      values.push(has_report_generation);
    }
    if (has_custom_branding !== undefined) {
      updates.push(`has_custom_branding = $${paramIndex++}`);
      values.push(has_custom_branding);
    }
    if (has_advanced_analytics !== undefined) {
      updates.push(`has_advanced_analytics = $${paramIndex++}`);
      values.push(has_advanced_analytics);
    }
    if (has_blogs_events_announcements !== undefined) {
      updates.push(`has_blogs_events_announcements = $${paramIndex++}`);
      values.push(has_blogs_events_announcements);
    }
    if (has_customized_feature_support !== undefined) {
      updates.push(`has_customized_feature_support = $${paramIndex++}`);
      values.push(has_customized_feature_support);
    }
    if (has_priority_support !== undefined) {
      updates.push(`has_priority_support = $${paramIndex++}`);
      values.push(has_priority_support);
    }
    if (has_email_support !== undefined) {
      updates.push(`has_email_support = $${paramIndex++}`);
      values.push(has_email_support);
    }
    if (min_therapists !== undefined) {
      updates.push(`min_therapists = $${paramIndex++}`);
      values.push(min_therapists);
    }
    if (max_therapists !== undefined) {
      updates.push(`max_therapists = $${paramIndex++}`);
      values.push(max_therapists);
    }
    if (plan_order !== undefined) {
      updates.push(`plan_order = $${paramIndex++}`);
      values.push(plan_order);
    }
    if (plan_duration_days !== undefined) {
      updates.push(`plan_duration_days = $${paramIndex++}`);
      values.push(plan_duration_days === null ? null : plan_duration_days);
    }
    if (individual_yearly_price !== undefined) {
      updates.push(`individual_yearly_price = $${paramIndex++}`);
      values.push(individual_yearly_price);
    }
    if (individual_quarterly_price !== undefined) {
      updates.push(`individual_quarterly_price = $${paramIndex++}`);
      values.push(individual_quarterly_price);
    }
    if (individual_monthly_price !== undefined) {
      updates.push(`individual_monthly_price = $${paramIndex++}`);
      values.push(individual_monthly_price);
    }
    if (organization_yearly_price !== undefined) {
      updates.push(`organization_yearly_price = $${paramIndex++}`);
      values.push(organization_yearly_price);
    }
    if (organization_quarterly_price !== undefined) {
      updates.push(`organization_quarterly_price = $${paramIndex++}`);
      values.push(organization_quarterly_price);
    }
    if (organization_monthly_price !== undefined) {
      updates.push(`organization_monthly_price = $${paramIndex++}`);
      values.push(organization_monthly_price);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (individual_yearly_enabled !== undefined) {
      updates.push(`individual_yearly_enabled = $${paramIndex++}`);
      values.push(individual_yearly_enabled);
    }
    if (individual_quarterly_enabled !== undefined) {
      updates.push(`individual_quarterly_enabled = $${paramIndex++}`);
      values.push(individual_quarterly_enabled);
    }
    if (individual_monthly_enabled !== undefined) {
      updates.push(`individual_monthly_enabled = $${paramIndex++}`);
      values.push(individual_monthly_enabled);
    }
    if (organization_yearly_enabled !== undefined) {
      updates.push(`organization_yearly_enabled = $${paramIndex++}`);
      values.push(organization_yearly_enabled);
    }
    if (organization_quarterly_enabled !== undefined) {
      updates.push(`organization_quarterly_enabled = $${paramIndex++}`);
      values.push(organization_quarterly_enabled);
    }
    if (organization_monthly_enabled !== undefined) {
      updates.push(`organization_monthly_enabled = $${paramIndex++}`);
      values.push(organization_monthly_enabled);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE subscription_plans
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM subscription_plans WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get price for a specific plan, user type, and billing period
   * @param {number} planId - Plan ID
   * @param {string} userType - 'individual' or 'organization'
   * @param {string} billingPeriod - 'yearly', 'quarterly', or 'monthly'
   * @returns {Promise<number>} Price per therapist
   */
  static async getPrice(planId, userType, billingPeriod) {
    const plan = await this.findById(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const priceColumn = `${userType}_${billingPeriod}_price`;
    const price = plan[priceColumn];

    if (price === undefined || price === null) {
      throw new Error(`Price not found for ${userType} ${billingPeriod}`);
    }

    return parseFloat(price);
  }

  /**
   * Calculate total price for organization based on number of therapists
   * @param {number} planId - Plan ID
   * @param {number} numTherapists - Number of therapists
   * @param {string} billingPeriod - 'yearly', 'quarterly', or 'monthly'
   * @returns {Promise<number>} Total price
   */
  static async calculateOrganizationPrice(planId, numTherapists, billingPeriod) {
    const pricePerTherapist = await this.getPrice(planId, 'organization', billingPeriod);
    return pricePerTherapist * numTherapists;
  }

  /**
   * Get individual practitioner plans (optionally exclude Free Plan from modal)
   * Includes both 'individual' and 'common' plan types
   * @param {boolean} excludeFreePlan - Whether to exclude Free Plan from results
   * @returns {Promise<Array>} Individual plans
   */
  static async getIndividualPlans(excludeFreePlan = false) {
    let query = `
      SELECT * FROM subscription_plans
      WHERE (plan_type = 'individual' OR plan_type = 'common') AND is_active = TRUE
    `;

    if (excludeFreePlan) {
      query += ` AND plan_name != 'Free Plan'`;
    }

    query += ` ORDER BY plan_order ASC`;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get organization plans filtered by therapist count
   * Includes both 'organization' and 'common' plan types
   * For 'common' plans, therapist count restrictions don't apply
   * @param {number} therapistCount - Number of therapists in organization
   * @returns {Promise<Array>} Filtered organization plans
   */
  static async getOrganizationPlans(therapistCount) {
    const query = `
      SELECT * FROM subscription_plans
      WHERE (
        plan_type = 'common' OR
        (plan_type = 'organization'
         AND min_therapists <= $1
         AND max_therapists >= $1)
      )
      AND is_active = TRUE
      ORDER BY plan_order ASC
    `;

    const result = await db.query(query, [therapistCount]);
    return result.rows;
  }

  /**
   * Validate if a plan is compatible with organization therapist count
   * Common plans are always valid, organization plans must match therapist count
   * @param {number} planId - Plan ID
   * @param {number} therapistCount - Number of therapists
   * @returns {Promise<boolean>} Whether plan is valid for this org
   */
  static async validatePlanForOrganization(planId, therapistCount) {
    const query = `
      SELECT COUNT(*) as count FROM subscription_plans
      WHERE id = $1
      AND is_active = TRUE
      AND (
        plan_type = 'common' OR
        (plan_type = 'organization'
         AND min_therapists <= $2
         AND max_therapists >= $2)
      )
    `;

    const result = await db.query(query, [planId, therapistCount]);
    return result.rows[0].count > 0;
  }

  /**
   * Get price for a specific plan, user type, billing period, and locale
   * Falls back to global pricing if locale-specific pricing not found
   * @param {number} planId - Plan ID
   * @param {string} userType - 'individual' or 'organization'
   * @param {string} billingPeriod - 'yearly', 'quarterly', or 'monthly'
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'IN')
   * @param {string} locale - Locale string (e.g., 'en-US', 'en-IN')
   * @returns {Promise<Object>} Object with price and currency_code
   */
  static async getPriceWithLocale(planId, userType, billingPeriod, countryCode = 'IN', locale = 'en-IN') {
    const plan = await this.findById(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Try to get locale-specific pricing first
    const localeQuery = `
      SELECT ${userType}_${billingPeriod}_price as price, currency_code
      FROM subscription_plan_locales
      WHERE subscription_plan_id = $1 
      AND country_code = $2 
      AND locale = $3 
      AND is_active = TRUE
    `;
    
    try {
      const localeResult = await db.query(localeQuery, [planId, countryCode, locale]);
      
      if (localeResult.rows.length > 0) {
        return {
          price: parseFloat(localeResult.rows[0].price),
          currency: localeResult.rows[0].currency_code
        };
      }
    } catch (error) {
      // If table doesn't exist yet (during migration), fall back to global pricing
      console.warn('Locale pricing table may not exist, falling back to global pricing:', error.message);
    }
    
    // Fallback to global pricing
    const priceColumn = `${userType}_${billingPeriod}_price`;
    const price = plan[priceColumn];
    
    if (price === undefined || price === null) {
      throw new Error(`Price not found for ${userType} ${billingPeriod}`);
    }

    return {
      price: parseFloat(price),
      currency: countryCode === 'IN' ? 'INR' : 'USD' // Default currency based on country
    };
  }

  /**
   * Get all active plans with locale-specific pricing
   * Falls back to global pricing if locale-specific pricing not found
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @param {string} locale - Locale string
   * @returns {Promise<Array>} Array of plans with locale-specific pricing
   */
  static async getActiveWithLocale(countryCode = 'IN', locale = 'en-IN') {
    const query = `
      WITH locale_prices AS (
        SELECT 
          sp.*,
          COALESCE(
            spl.individual_yearly_price,
            sp.individual_yearly_price
          ) as locale_individual_yearly_price,
          COALESCE(
            spl.individual_quarterly_price,
            sp.individual_quarterly_price
          ) as locale_individual_quarterly_price,
          COALESCE(
            spl.individual_monthly_price,
            sp.individual_monthly_price
          ) as locale_individual_monthly_price,
          COALESCE(
            spl.organization_yearly_price,
            sp.organization_yearly_price
          ) as locale_organization_yearly_price,
          COALESCE(
            spl.organization_quarterly_price,
            sp.organization_quarterly_price
          ) as locale_organization_quarterly_price,
          COALESCE(
            spl.organization_monthly_price,
            sp.organization_monthly_price
          ) as locale_organization_monthly_price,
          COALESCE(spl.currency_code, CASE WHEN $1 = 'IN' THEN 'INR' ELSE 'USD' END) as currency_code
        FROM subscription_plans sp
        LEFT JOIN subscription_plan_locales spl 
          ON sp.id = spl.subscription_plan_id 
          AND spl.country_code = $1 
          AND spl.locale = $2
          AND spl.is_active = TRUE
        WHERE sp.is_active = TRUE
      )
      SELECT * FROM locale_prices
      ORDER BY plan_order ASC, plan_name ASC
    `;
    
    try {
      const result = await db.query(query, [countryCode, locale]);
      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, fall back to regular getActive
      if (error.message.includes('subscription_plan_locales')) {
        console.warn('Locale pricing table may not exist, falling back to global pricing:', error.message);
        return this.getActive();
      }
      throw error;
    }
  }

  /**
   * Get individual plans with locale-specific pricing
   * Falls back to global pricing if locale-specific pricing not found
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @param {string} locale - Locale string
   * @param {boolean} excludeFreePlan - Whether to exclude Free Plan from results
   * @returns {Promise<Array>} Array of individual plans with locale-specific pricing
   */
  static async getIndividualPlansWithLocale(countryCode = 'IN', locale = 'en-IN', excludeFreePlan = false) {
    let query = `
      WITH locale_prices AS (
        SELECT 
          sp.*,
          COALESCE(spl.individual_yearly_price, sp.individual_yearly_price) as locale_individual_yearly_price,
          COALESCE(spl.individual_quarterly_price, sp.individual_quarterly_price) as locale_individual_quarterly_price,
          COALESCE(spl.individual_monthly_price, sp.individual_monthly_price) as locale_individual_monthly_price,
          COALESCE(spl.currency_code, CASE WHEN $1 = 'IN' THEN 'INR' ELSE 'USD' END) as currency_code
        FROM subscription_plans sp
        LEFT JOIN subscription_plan_locales spl 
          ON sp.id = spl.subscription_plan_id 
          AND spl.country_code = $1 
          AND spl.locale = $2
          AND spl.is_active = TRUE
        WHERE (sp.plan_type = 'individual' OR sp.plan_type = 'common') 
          AND sp.is_active = TRUE
    `;
    
    if (excludeFreePlan) {
      query += ` AND sp.plan_name != 'Free Plan'`;
    }
    
    query += ` ) SELECT * FROM locale_prices ORDER BY plan_order ASC`;
    
    try {
      const result = await db.query(query, [countryCode, locale]);
      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, fall back to regular getIndividualPlans
      if (error.message.includes('subscription_plan_locales')) {
        console.warn('Locale pricing table may not exist, falling back to global pricing:', error.message);
        return this.getIndividualPlans(excludeFreePlan);
      }
      throw error;
    }
  }

  /**
   * Get organization plans with locale-specific pricing
   * Falls back to global pricing if locale-specific pricing not found
   * @param {number} therapistCount - Number of therapists in organization
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @param {string} locale - Locale string
   * @returns {Promise<Array>} Array of organization plans with locale-specific pricing
   */
  static async getOrganizationPlansWithLocale(therapistCount, countryCode = 'IN', locale = 'en-IN') {
    const query = `
      WITH locale_prices AS (
        SELECT 
          sp.*,
          COALESCE(spl.organization_yearly_price, sp.organization_yearly_price) as locale_organization_yearly_price,
          COALESCE(spl.organization_quarterly_price, sp.organization_quarterly_price) as locale_organization_quarterly_price,
          COALESCE(spl.organization_monthly_price, sp.organization_monthly_price) as locale_organization_monthly_price,
          COALESCE(spl.currency_code, CASE WHEN $1 = 'IN' THEN 'INR' ELSE 'USD' END) as currency_code
        FROM subscription_plans sp
        LEFT JOIN subscription_plan_locales spl 
          ON sp.id = spl.subscription_plan_id 
          AND spl.country_code = $1 
          AND spl.locale = $2
          AND spl.is_active = TRUE
        WHERE (
          sp.plan_type = 'common' OR
          (sp.plan_type = 'organization'
           AND sp.min_therapists <= $3
           AND sp.max_therapists >= $3)
        )
        AND sp.is_active = TRUE
      )
      SELECT * FROM locale_prices
      ORDER BY plan_order ASC
    `;
    
    try {
      const result = await db.query(query, [countryCode, locale, therapistCount]);
      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, fall back to regular getOrganizationPlans
      if (error.message.includes('subscription_plan_locales')) {
        console.warn('Locale pricing table may not exist, falling back to global pricing:', error.message);
        return this.getOrganizationPlans(therapistCount);
      }
      throw error;
    }
  }
}

module.exports = SubscriptionPlan;












