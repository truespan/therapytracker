const db = require('../config/database');

class RazorpaySubscription {
  /**
   * Create a new subscription record
   * @param {Object} subscriptionData - Subscription data
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created subscription record
   */
  static async create(subscriptionData, client = null) {
    const {
      razorpay_subscription_id,
      razorpay_plan_id,
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      status,
      current_start,
      current_end,
      ended_at,
      quantity = 1,
      amount,
      currency = 'INR',
      metadata
    } = subscriptionData;

    const query = `
      INSERT INTO razorpay_subscriptions (
        razorpay_subscription_id, razorpay_plan_id, customer_id, customer_type,
        subscription_plan_id, billing_period, status, current_start, current_end,
        ended_at, quantity, amount, currency, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      razorpay_subscription_id,
      razorpay_plan_id,
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      status,
      current_start,
      current_end,
      ended_at,
      quantity,
      amount,
      currency,
      metadata ? JSON.stringify(metadata) : null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find subscription by Razorpay subscription ID
   * @param {string} razorpaySubscriptionId - Razorpay subscription ID
   * @returns {Promise<Object|null>} Subscription record
   */
  static async findBySubscriptionId(razorpaySubscriptionId) {
    const query = `
      SELECT rs.*, sp.plan_name, sp.has_video
      FROM razorpay_subscriptions rs
      JOIN subscription_plans sp ON rs.subscription_plan_id = sp.id
      WHERE rs.razorpay_subscription_id = $1
    `;
    const result = await db.query(query, [razorpaySubscriptionId]);
    return result.rows[0] || null;
  }

  /**
   * Find active subscription by customer
   * @param {number} customerId - Customer ID
   * @param {string} customerType - Customer type ('partner' or 'organization')
   * @returns {Promise<Object|null>} Active subscription record
   */
  static async findActiveByCustomer(customerId, customerType) {
    const query = `
      SELECT rs.*, sp.plan_name, sp.has_video
      FROM razorpay_subscriptions rs
      JOIN subscription_plans sp ON rs.subscription_plan_id = sp.id
      WHERE rs.customer_id = $1 
        AND rs.customer_type = $2
        AND rs.status = 'active'
      ORDER BY rs.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [customerId, customerType]);
    return result.rows[0] || null;
  }

  /**
   * Find all subscriptions by customer
   * @param {number} customerId - Customer ID
   * @param {string} customerType - Customer type ('partner' or 'organization')
   * @returns {Promise<Array>} Array of subscription records
   */
  static async findByCustomer(customerId, customerType) {
    const query = `
      SELECT rs.*, sp.plan_name, sp.has_video
      FROM razorpay_subscriptions rs
      JOIN subscription_plans sp ON rs.subscription_plan_id = sp.id
      WHERE rs.customer_id = $1 AND rs.customer_type = $2
      ORDER BY rs.created_at DESC
    `;
    const result = await db.query(query, [customerId, customerType]);
    return result.rows;
  }

  /**
   * Update subscription status
   * @param {string} razorpaySubscriptionId - Razorpay subscription ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated subscription record
   */
  static async update(razorpaySubscriptionId, updateData) {
    const {
      status,
      current_start,
      current_end,
      ended_at,
      quantity,
      amount
    } = updateData;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (current_start !== undefined) {
      updates.push(`current_start = $${paramIndex++}`);
      values.push(current_start);
    }
    if (current_end !== undefined) {
      updates.push(`current_end = $${paramIndex++}`);
      values.push(current_end);
    }
    if (ended_at !== undefined) {
      updates.push(`ended_at = $${paramIndex++}`);
      values.push(ended_at);
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      values.push(quantity);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }

    if (updates.length === 0) {
      return this.findBySubscriptionId(razorpaySubscriptionId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(razorpaySubscriptionId);

    const query = `
      UPDATE razorpay_subscriptions
      SET ${updates.join(', ')}
      WHERE razorpay_subscription_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = RazorpaySubscription;

