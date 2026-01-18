const db = require('../config/database');

class Earnings {
  /**
   * Create a new earnings record
   */
  static async create(earningsData, client = null) {
    const {
      recipient_id,
      recipient_type,
      razorpay_payment_id,
      amount,
      currency = 'INR',
      status = 'pending',
      session_id,
      appointment_id,
      payout_date,
      metadata
    } = earningsData;

    const query = `
      INSERT INTO earnings (
        recipient_id, recipient_type, razorpay_payment_id, amount, currency,
        status, session_id, appointment_id, payout_date, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      recipient_id,
      recipient_type,
      razorpay_payment_id,
      amount,
      currency,
      status,
      session_id,
      appointment_id,
      payout_date,
      metadata ? JSON.stringify(metadata) : null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Get earnings summary for a recipient
   */
  static async getEarningsSummary(recipientId, recipientType) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
        COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as upcoming_payout,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings
      FROM earnings
      WHERE recipient_id = $1 AND recipient_type = $2
    `;

    const result = await db.query(query, [recipientId, recipientType]);
    return result.rows[0];
  }

  /**
   * Get revenue by month
   */
  static async getRevenueByMonth(recipientId, recipientType, months = 12) {
    const query = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COALESCE(SUM(amount), 0) as revenue
      FROM earnings
      WHERE recipient_id = $1 
        AND recipient_type = $2
        AND status IN ('available', 'withdrawn')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT $3
    `;

    const result = await db.query(query, [recipientId, recipientType, months]);
    return result.rows;
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(recipientId, recipientType) {
    // For partners, count sessions directly
    // Completed sessions: sessions that have occurred (session_date in the past)
    // Cancellations/No-shows: appointments that were cancelled or sessions that were scheduled but not completed
    if (recipientType === 'partner') {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE ts.session_date < NOW()) as completed_sessions,
          (
            SELECT COUNT(*) 
            FROM appointments a
            WHERE a.partner_id = $1 
              AND a.status = 'cancelled'
          ) as cancellations_no_shows
        FROM therapy_sessions ts
        WHERE ts.partner_id = $1
      `;
      const result = await db.query(query, [recipientId]);
      return result.rows[0];
    }

    // For organizations, count sessions for all partners in the organization
    if (recipientType === 'organization') {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE ts.session_date < NOW()) as completed_sessions,
          (
            SELECT COUNT(*) 
            FROM appointments a
            JOIN partners p ON a.partner_id = p.id
            WHERE p.organization_id = $1 
              AND a.status = 'cancelled'
          ) as cancellations_no_shows
        FROM therapy_sessions ts
        JOIN partners p ON ts.partner_id = p.id
        WHERE p.organization_id = $1
      `;
      const result = await db.query(query, [recipientId]);
      return result.rows[0];
    }

    return { completed_sessions: 0, cancellations_no_shows: 0 };
  }

  /**
   * Update earnings status by Razorpay payment ID
   * Only updates earnings that are currently in 'pending' status to prevent accidental rollbacks
   */
  static async updateStatusByPaymentId(razorpayPaymentId, status, payoutDate = null, settlementId = null) {
    let query = `
      UPDATE earnings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const values = [status];
    let paramIndex = 2;

    if (payoutDate) {
      query += `, payout_date = $${paramIndex}`;
      values.push(payoutDate);
      paramIndex++;
    }

    if (settlementId) {
      query += `, razorpay_settlement_id = $${paramIndex}`;
      values.push(settlementId);
      paramIndex++;
    }

    query += ` WHERE razorpay_payment_id = $${paramIndex} AND status = 'pending' RETURNING *`;
    values.push(razorpayPaymentId);

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update multiple earnings by payment IDs with settlement info
   */
  static async updateMultipleByPaymentIds(paymentIds, status, payoutDate = null, settlementId = null) {
    if (!paymentIds || paymentIds.length === 0) {
      return [];
    }

    let query = `
      UPDATE earnings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const values = [status];
    let paramIndex = 2;

    if (payoutDate) {
      query += `, payout_date = $${paramIndex}`;
      values.push(payoutDate);
      paramIndex++;
    }

    if (settlementId) {
      query += `, razorpay_settlement_id = $${paramIndex}`;
      values.push(settlementId);
      paramIndex++;
    }

    query += ` WHERE razorpay_payment_id = ANY($${paramIndex}::text[]) AND status = 'pending' RETURNING *`;
    values.push(paymentIds);

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Find earnings by Razorpay payment ID
   */
  static async findByPaymentId(razorpayPaymentId) {
    const query = 'SELECT * FROM earnings WHERE razorpay_payment_id = $1';
    const result = await db.query(query, [razorpayPaymentId]);
    return result.rows[0] || null;
  }

  /**
   * Get all earnings for a recipient
   */
  static async getEarnings(recipientId, recipientType, filters = {}) {
    let query = `
      SELECT e.*, 
        ts.id as session_id_ref,
        a.id as appointment_id_ref
      FROM earnings e
      LEFT JOIN therapy_sessions ts ON e.session_id = ts.id
      LEFT JOIN appointments a ON e.appointment_id = a.id
      WHERE e.recipient_id = $1 AND e.recipient_type = $2
    `;
    const values = [recipientId, recipientType];
    let paramIndex = 3;

    if (filters.status) {
      query += ` AND e.status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND e.created_at >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND e.created_at <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ` ORDER BY e.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get all unique recipients with earnings summary (candidates for payout)
   * Returns only recipients with total_earnings > 0
   */
  static async getEarningsCandidates() {
    const query = `
      SELECT 
        recipient_id,
        recipient_type,
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
        COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings
      FROM earnings
      GROUP BY recipient_id, recipient_type
      HAVING COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) > 0
      ORDER BY recipient_type, recipient_id
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get available earnings records for a recipient (for payout linking)
   */
  static async getAvailableEarnings(recipientId, recipientType) {
    const query = `
      SELECT id, amount, payout_date
      FROM earnings
      WHERE recipient_id = $1 
        AND recipient_type = $2
        AND status = 'available'
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [recipientId, recipientType]);
    return result.rows;
  }

  /**
   * Link earnings records to a payout
   * Updates payout_id and payout_date for specified earnings records
   */
  static async updatePayoutForEarnings(earningsIds, payoutId, payoutDate, client = null) {
    if (!earningsIds || earningsIds.length === 0) {
      return { rowCount: 0 };
    }

    const query = `
      UPDATE earnings
      SET payout_id = $1,
          payout_date = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($3::int[])
        AND status = 'available'
      RETURNING *
    `;

    const dbClient = client || db;
    const result = await dbClient.query(query, [payoutId, payoutDate, earningsIds]);
    return result;
  }
}

module.exports = Earnings;

