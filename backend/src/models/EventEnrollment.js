const db = require('../config/database');

class EventEnrollment {
  static async create(enrollmentData, client = null) {
    const { event_id, user_id, enrollment_status, payment_status } = enrollmentData;
    
    const query = `
      INSERT INTO event_enrollments (event_id, user_id, enrollment_status, payment_status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (event_id, user_id) DO UPDATE
      SET enrollment_status = EXCLUDED.enrollment_status,
          payment_status = EXCLUDED.payment_status
      RETURNING *
    `;
    
    const values = [
      event_id,
      user_id,
      enrollment_status || 'pending',
      payment_status || 'pending'
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findByEvent(eventId) {
    const query = `
      SELECT ee.*, u.name as user_name, u.email as user_email, u.contact as user_contact
      FROM event_enrollments ee
      JOIN users u ON ee.user_id = u.id
      WHERE ee.event_id = $1
      ORDER BY ee.enrolled_at DESC
    `;
    const result = await db.query(query, [eventId]);
    return result.rows;
  }

  static async findByUser(userId) {
    const query = `
      SELECT ee.*, e.title as event_title, e.event_date, e.fee_amount, p.name as partner_name
      FROM event_enrollments ee
      JOIN events e ON ee.event_id = e.id
      JOIN partners p ON e.partner_id = p.id
      WHERE ee.user_id = $1
      ORDER BY ee.enrolled_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findByEventAndUser(eventId, userId) {
    const query = `
      SELECT ee.*
      FROM event_enrollments ee
      WHERE ee.event_id = $1 AND ee.user_id = $2
    `;
    const result = await db.query(query, [eventId, userId]);
    return result.rows[0];
  }

  static async updateStatus(enrollmentId, enrollment_status, payment_status = null) {
    let query;
    let values;

    if (payment_status !== null) {
      query = `
        UPDATE event_enrollments 
        SET enrollment_status = $1,
            payment_status = $2
        WHERE id = $3
        RETURNING *
      `;
      values = [enrollment_status, payment_status, enrollmentId];
    } else {
      query = `
        UPDATE event_enrollments 
        SET enrollment_status = $1
        WHERE id = $2
        RETURNING *
      `;
      values = [enrollment_status, enrollmentId];
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(enrollmentId) {
    const query = `
      DELETE FROM event_enrollments 
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [enrollmentId]);
    return result.rows[0];
  }

  static async countByEvent(eventId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM event_enrollments 
      WHERE event_id = $1 AND enrollment_status != 'cancelled'
    `;
    const result = await db.query(query, [eventId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = EventEnrollment;
