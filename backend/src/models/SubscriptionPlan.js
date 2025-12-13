const db = require('../config/database');

class SubscriptionPlan {
  static async create(planData, client = null) {
    const {
      plan_name,
      min_sessions,
      max_sessions,
      has_video,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active
    } = planData;

    const query = `
      INSERT INTO subscription_plans (
        plan_name, min_sessions, max_sessions, has_video,
        individual_yearly_price, individual_quarterly_price, individual_monthly_price,
        organization_yearly_price, organization_quarterly_price, organization_monthly_price,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      plan_name,
      min_sessions,
      max_sessions,
      has_video !== undefined ? has_video : false,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active !== undefined ? is_active : true
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
      min_sessions,
      max_sessions,
      has_video,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active
    } = planData;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (plan_name !== undefined) {
      updates.push(`plan_name = $${paramIndex++}`);
      values.push(plan_name);
    }
    if (min_sessions !== undefined) {
      updates.push(`min_sessions = $${paramIndex++}`);
      values.push(min_sessions);
    }
    if (max_sessions !== undefined) {
      updates.push(`max_sessions = $${paramIndex++}`);
      values.push(max_sessions);
    }
    if (has_video !== undefined) {
      updates.push(`has_video = $${paramIndex++}`);
      values.push(has_video);
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
}

module.exports = SubscriptionPlan;





