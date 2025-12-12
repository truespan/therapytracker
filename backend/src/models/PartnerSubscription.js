const db = require('../config/database');

class PartnerSubscription {
  /**
   * Assign a subscription plan to a partner
   * @param {Object} subscriptionData - Subscription assignment data
   * @param {number} subscriptionData.partner_id - Partner ID
   * @param {number} subscriptionData.subscription_plan_id - Subscription plan ID
   * @param {string} subscriptionData.billing_period - Billing period (monthly, quarterly, yearly)
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created subscription assignment
   */
  static async create(subscriptionData, client = null) {
    const { partner_id, subscription_plan_id, billing_period } = subscriptionData;

    const query = `
      INSERT INTO partner_subscriptions (partner_id, subscription_plan_id, billing_period)
      VALUES ($1, $2, $3)
      ON CONFLICT (partner_id, subscription_plan_id, billing_period) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [partner_id, subscription_plan_id, billing_period];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Get subscription assignment by ID
   * @param {number} id - Subscription assignment ID
   * @returns {Promise<Object|null>} Subscription assignment
   */
  static async findById(id) {
    const query = `
      SELECT ps.*, 
             p.name as partner_name, 
             p.partner_id as partner_code,
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video
      FROM partner_subscriptions ps
      JOIN partners p ON ps.partner_id = p.id
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE ps.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all subscription assignments for a partner
   * @param {number} partnerId - Partner ID
   * @returns {Promise<Array>} Array of subscription assignments
   */
  static async findByPartnerId(partnerId) {
    const query = `
      SELECT ps.*, 
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video
      FROM partner_subscriptions ps
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE ps.partner_id = $1
      ORDER BY ps.assigned_at DESC
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  /**
   * Get or create Free Plan subscription for a partner
   * @param {number} partnerId - Partner ID
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Free Plan subscription assignment
   */
  static async getOrCreateFreePlan(partnerId, client = null) {
    const dbClient = client || db;
    
    // First, try to find Free Plan
    const freePlanQuery = `SELECT id FROM subscription_plans WHERE plan_name = 'Free Plan' AND is_active = TRUE LIMIT 1`;
    const freePlanResult = await dbClient.query(freePlanQuery);
    
    if (freePlanResult.rows.length === 0) {
      throw new Error('Free Plan not found in subscription_plans table. Please run the migration to add Free Plan.');
    }
    
    const freePlanId = freePlanResult.rows[0].id;
    
    // Check if partner already has a subscription (any subscription, not just Free Plan)
    const existingQuery = `
      SELECT ps.*, 
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video
      FROM partner_subscriptions ps
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE ps.partner_id = $1
      ORDER BY ps.assigned_at DESC
      LIMIT 1
    `;
    const existingResult = await dbClient.query(existingQuery, [partnerId]);
    
    if (existingResult.rows.length > 0) {
      // Partner already has a subscription, return it
      return existingResult.rows[0];
    }
    
    // Partner doesn't have a subscription, create Free Plan with monthly billing
    const createQuery = `
      INSERT INTO partner_subscriptions (partner_id, subscription_plan_id, billing_period)
      VALUES ($1, $2, 'monthly')
      RETURNING *
    `;
    const createResult = await dbClient.query(createQuery, [partnerId, freePlanId]);
    
    // Return the created subscription with plan details
    const subscriptionId = createResult.rows[0].id;
    const fullQuery = `
      SELECT ps.*, 
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video
      FROM partner_subscriptions ps
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE ps.id = $1
    `;
    const fullResult = await dbClient.query(fullQuery, [subscriptionId]);
    return fullResult.rows[0];
  }

  /**
   * Get all subscription assignments for an organization
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Array>} Array of subscription assignments with partner details
   */
  static async findByOrganizationId(organizationId) {
    const query = `
      SELECT ps.*, 
             p.id as partner_id,
             p.name as partner_name, 
             p.partner_id as partner_code,
             p.email as partner_email,
             sp.plan_name,
             sp.min_sessions,
             sp.max_sessions,
             sp.has_video
      FROM partner_subscriptions ps
      JOIN partners p ON ps.partner_id = p.id
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE p.organization_id = $1
      ORDER BY p.name, ps.assigned_at DESC
    `;
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Update a subscription assignment
   * @param {number} id - Subscription assignment ID
   * @param {Object} updateData - Update data
   * @param {number} updateData.subscription_plan_id - New subscription plan ID
   * @param {string} updateData.billing_period - New billing period
   * @returns {Promise<Object>} Updated subscription assignment
   */
  static async update(id, updateData) {
    const { subscription_plan_id, billing_period } = updateData;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (subscription_plan_id !== undefined) {
      updates.push(`subscription_plan_id = $${paramIndex++}`);
      values.push(subscription_plan_id);
    }
    if (billing_period !== undefined) {
      updates.push(`billing_period = $${paramIndex++}`);
      values.push(billing_period);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE partner_subscriptions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a subscription assignment
   * @param {number} id - Subscription assignment ID
   * @returns {Promise<Object>} Deleted subscription assignment
   */
  static async delete(id) {
    const query = 'DELETE FROM partner_subscriptions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete all subscription assignments for a partner
   * @param {number} partnerId - Partner ID
   * @returns {Promise<number>} Number of deleted assignments
   */
  static async deleteByPartnerId(partnerId) {
    const query = 'DELETE FROM partner_subscriptions WHERE partner_id = $1';
    const result = await db.query(query, [partnerId]);
    return result.rowCount;
  }

  /**
   * Assign subscriptions to multiple partners
   * @param {Array} assignments - Array of assignment objects
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Array>} Array of created assignments
   */
  static async bulkAssign(assignments, client = null) {
    const dbClient = client || db;
    const results = [];

    for (const assignment of assignments) {
      const result = await this.create(assignment, dbClient);
      results.push(result);
    }

    return results;
  }

  /**
   * Remove subscriptions from multiple partners
   * @param {Array} partnerIds - Array of partner IDs
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<number>} Total number of deleted assignments
   */
  static async bulkRemove(partnerIds, client = null) {
    const dbClient = client || db;
    let totalDeleted = 0;

    for (const partnerId of partnerIds) {
      const query = 'DELETE FROM partner_subscriptions WHERE partner_id = $1';
      const result = await dbClient.query(query, [partnerId]);
      totalDeleted += result.rowCount;
    }

    return totalDeleted;
  }
}

module.exports = PartnerSubscription;

