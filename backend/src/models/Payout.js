const db = require('../config/database');

class Payout {
  /**
   * Create a new payout record
   */
  static async create(payoutData, client = null) {
    const {
      recipient_id,
      recipient_type,
      amount,
      currency = 'INR',
      status = 'pending',
      payout_date,
      payment_method,
      transaction_id,
      notes,
      metadata
    } = payoutData;

    const query = `
      INSERT INTO payouts (
        recipient_id, recipient_type, amount, currency, status,
        payout_date, payment_method, transaction_id, notes, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      recipient_id,
      recipient_type,
      amount,
      currency,
      status,
      payout_date,
      payment_method,
      transaction_id,
      notes,
      metadata ? JSON.stringify(metadata) : null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Get payouts for a recipient
   */
  static async getPayouts(recipientId, recipientType, filters = {}) {
    let query = `
      SELECT * FROM payouts
      WHERE recipient_id = $1 AND recipient_type = $2
    `;
    const values = [recipientId, recipientType];
    let paramIndex = 3;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND payout_date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND payout_date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ` ORDER BY payout_date DESC, created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = Payout;

