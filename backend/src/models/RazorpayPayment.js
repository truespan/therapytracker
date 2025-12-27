const db = require('../config/database');

class RazorpayPayment {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created payment record
   */
  static async create(paymentData, client = null) {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      amount,
      currency = 'INR',
      status,
      payment_method,
      description,
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      metadata
    } = paymentData;

    const query = `
      INSERT INTO razorpay_payments (
        razorpay_payment_id, razorpay_order_id, razorpay_subscription_id,
        amount, currency, status, payment_method, description,
        customer_id, customer_type, subscription_plan_id, billing_period, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      amount,
      currency,
      status,
      payment_method,
      description,
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period,
      metadata ? JSON.stringify(metadata) : null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find payment by Razorpay payment ID
   * @param {string} razorpayPaymentId - Razorpay payment ID
   * @returns {Promise<Object|null>} Payment record
   */
  static async findByPaymentId(razorpayPaymentId) {
    const query = 'SELECT * FROM razorpay_payments WHERE razorpay_payment_id = $1';
    const result = await db.query(query, [razorpayPaymentId]);
    return result.rows[0] || null;
  }

  /**
   * Find payments by customer
   * @param {number} customerId - Customer ID
   * @param {string} customerType - Customer type ('partner' or 'organization')
   * @returns {Promise<Array>} Array of payment records
   */
  static async findByCustomer(customerId, customerType) {
    const query = `
      SELECT * FROM razorpay_payments
      WHERE customer_id = $1 AND customer_type = $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [customerId, customerType]);
    return result.rows;
  }

  /**
   * Update payment status
   * @param {string} razorpayPaymentId - Razorpay payment ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated payment record
   */
  static async updateStatus(razorpayPaymentId, status) {
    const query = `
      UPDATE razorpay_payments
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE razorpay_payment_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, razorpayPaymentId]);
    return result.rows[0];
  }

  /**
   * Find payment by order ID
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {Promise<Object|null>} Payment record
   */
  static async findByOrderId(razorpayOrderId) {
    const query = 'SELECT * FROM razorpay_payments WHERE razorpay_order_id = $1';
    const result = await db.query(query, [razorpayOrderId]);
    return result.rows[0] || null;
  }
}

module.exports = RazorpayPayment;

