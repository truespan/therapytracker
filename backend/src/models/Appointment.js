const db = require('../config/database');

class Appointment {
  static async create(appointmentData) {
    const { partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes } = appointmentData;
    const query = `
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [partner_id, user_id, title, appointment_date, end_date, duration_minutes || 60, notes];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM appointments WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.partner_id = $1
    `;
    const values = [partnerId];
    
    if (startDate && endDate) {
      query += ` AND a.appointment_date >= $2 AND a.appointment_date <= $3`;
      values.push(startDate, endDate);
    }
    
    query += ` ORDER BY a.appointment_date ASC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  static async findByUser(userId) {
    const query = `
      SELECT a.*, p.name as partner_name
      FROM appointments a
      JOIN partners p ON a.partner_id = p.id
      WHERE a.user_id = $1 AND a.status = 'scheduled'
      ORDER BY a.appointment_date ASC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async update(id, appointmentData) {
    const { title, appointment_date, end_date, duration_minutes, status, notes } = appointmentData;
    const query = `
      UPDATE appointments 
      SET title = COALESCE($1, title),
          appointment_date = COALESCE($2, appointment_date),
          end_date = COALESCE($3, end_date),
          duration_minutes = COALESCE($4, duration_minutes),
          status = COALESCE($5, status),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const values = [title, appointment_date, end_date, duration_minutes, status, notes, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM appointments WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async checkConflict(partnerId, appointmentDate, endDate, excludeId = null) {
    let query = `
      SELECT * FROM appointments
      WHERE partner_id = $1
      AND status != 'cancelled'
      AND (
        (appointment_date <= $2 AND end_date > $2)
        OR (appointment_date < $3 AND end_date >= $3)
        OR (appointment_date >= $2 AND end_date <= $3)
      )
    `;
    const values = [partnerId, appointmentDate, endDate];
    
    if (excludeId) {
      query += ` AND id != $4`;
      values.push(excludeId);
    }
    
    const result = await db.query(query, values);
    return result.rows.length > 0;
  }
}

module.exports = Appointment;

