const db = require('../config/database');

class RazorpayOrder {
  /**
   * Create a new order record
   * @param {Object} orderData - Order data
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created order record
   */
  static async create(orderData, client = null) {
    const {
      razorpay_order_id,
      amount,
      currency = 'INR',
      receipt,
      status = 'created',
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      notes
    } = orderData;

    const query = `
      INSERT INTO razorpay_orders (
        razorpay_order_id, amount, currency, receipt, status,
        customer_id, customer_type, subscription_plan_id, billing_period, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      razorpay_order_id,
      amount,
      currency,
      receipt,
      status,
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      notes ? JSON.stringify(notes) : null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find order by Razorpay order ID
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {Promise<Object|null>} Order record
   */
  static async findByOrderId(razorpayOrderId) {
    const query = 'SELECT * FROM razorpay_orders WHERE razorpay_order_id = $1';
    const result = await db.query(query, [razorpayOrderId]);
    return result.rows[0] || null;
  }

  /**
   * Update order status
   * @param {string} razorpayOrderId - Razorpay order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated order record
   */
  static async updateStatus(razorpayOrderId, status) {
    const query = `
      UPDATE razorpay_orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE razorpay_order_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, razorpayOrderId]);
    return result.rows[0];
  }

  /**
   * Find orders by customer
   * @param {number} customerId - Customer ID
   * @param {string} customerType - Customer type ('partner' or 'organization')
   * @returns {Promise<Array>} Array of order records
   */
  static async findByCustomer(customerId, customerType) {
    const query = `
      SELECT * FROM razorpay_orders
      WHERE customer_id = $1 AND customer_type = $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [customerId, customerType]);
    return result.rows;
  }
}

module.exports = RazorpayOrder;

