const db = require('../config/database');

class Appointment {
  static async create(appointmentData) {
    const { partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes, timezone } = appointmentData;
    const query = `
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, notes, timezone)
      VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8)
      RETURNING *
    `;
    const values = [partner_id, user_id, title, appointment_date, end_date, duration_minutes || 60, notes, timezone || 'UTC'];
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
    const { title, appointment_date, end_date, duration_minutes, status, notes, timezone } = appointmentData;
    const query = `
      UPDATE appointments
      SET title = COALESCE($1, title),
          appointment_date = COALESCE($2::timestamptz, appointment_date),
          end_date = COALESCE($3::timestamptz, end_date),
          duration_minutes = COALESCE($4, duration_minutes),
          status = COALESCE($5, status),
          notes = COALESCE($6, notes),
          timezone = COALESCE($7, timezone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    const values = [title, appointment_date, end_date, duration_minutes, status, notes, timezone, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM appointments WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async checkConflict(partnerId, appointmentDate, endDate, excludeId = null) {
    // Check conflicts with other appointments
    let appointmentQuery = `
      SELECT * FROM appointments
      WHERE partner_id = $1
      AND status != 'cancelled'
      AND (
        (appointment_date <= $2 AND end_date > $2)
        OR (appointment_date < $3 AND end_date >= $3)
        OR (appointment_date >= $2 AND end_date <= $3)
      )
    `;
    const appointmentValues = [partnerId, appointmentDate, endDate];

    if (excludeId) {
      appointmentQuery += ` AND id != $4`;
      appointmentValues.push(excludeId);
    }

    const appointmentResult = await db.query(appointmentQuery, appointmentValues);
    if (appointmentResult.rows.length > 0) {
      return true;
    }

    // Check conflicts with video sessions
    const videoQuery = `
      SELECT * FROM video_sessions
      WHERE partner_id = $1
      AND status != 'cancelled'
      AND (
        (session_date <= $2 AND end_date > $2)
        OR (session_date < $3 AND end_date >= $3)
        OR (session_date >= $2 AND end_date <= $3)
      )
    `;
    const videoResult = await db.query(videoQuery, [partnerId, appointmentDate, endDate]);
    return videoResult.rows.length > 0;
  }

  static async getConflictDetails(partnerId, appointmentDate, endDate, excludeId = null) {
    // Get conflicting appointments with user details
    let appointmentQuery = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.partner_id = $1
      AND a.status != 'cancelled'
      AND (
        (a.appointment_date <= $2 AND a.end_date > $2)
        OR (a.appointment_date < $3 AND a.end_date >= $3)
        OR (a.appointment_date >= $2 AND a.end_date <= $3)
      )
    `;
    const appointmentValues = [partnerId, appointmentDate, endDate];

    if (excludeId) {
      appointmentQuery += ` AND a.id != $4`;
      appointmentValues.push(excludeId);
    }

    const appointmentResult = await db.query(appointmentQuery, appointmentValues);
    const conflicts = [...appointmentResult.rows];

    // Get conflicting video sessions with user details
    const videoQuery = `
      SELECT v.*, u.name as user_name, u.email as user_email,
             v.session_date as appointment_date, v.end_date
      FROM video_sessions v
      JOIN users u ON v.user_id = u.id
      WHERE v.partner_id = $1
      AND v.status != 'cancelled'
      AND (
        (v.session_date <= $2 AND v.end_date > $2)
        OR (v.session_date < $3 AND v.end_date >= $3)
        OR (v.session_date >= $2 AND v.end_date <= $3)
      )
    `;
    const videoResult = await db.query(videoQuery, [partnerId, appointmentDate, endDate]);

    // Add video sessions to conflicts with a type flag
    const videoConflicts = videoResult.rows.map(v => ({
      ...v,
      conflict_type: 'video_session'
    }));

    conflicts.push(...videoConflicts);

    return conflicts;
  }

  static async findUpcomingByPartner(partnerId, daysAhead = 7) {
    const query = `
      SELECT
        a.*,
        u.name as user_name,
        u.email as user_email,
        (
          SELECT ts.id
          FROM therapy_sessions ts
          WHERE (
            ts.appointment_id = a.id
            OR (
              ts.appointment_id IS NULL
              AND ts.partner_id = a.partner_id
              AND ts.user_id = a.user_id
              AND DATE(ts.session_date) = DATE(a.appointment_date)
              AND ABS(EXTRACT(EPOCH FROM (ts.session_date - a.appointment_date))) < 300
            )
          )
          ORDER BY CASE WHEN ts.appointment_id IS NOT NULL THEN 0 ELSE 1 END
          LIMIT 1
        ) as session_id,
        CASE WHEN (
          SELECT ts.id
          FROM therapy_sessions ts
          WHERE (
            ts.appointment_id = a.id
            OR (
              ts.appointment_id IS NULL
              AND ts.partner_id = a.partner_id
              AND ts.user_id = a.user_id
              AND DATE(ts.session_date) = DATE(a.appointment_date)
              AND ABS(EXTRACT(EPOCH FROM (ts.session_date - a.appointment_date))) < 300
            )
          )
          LIMIT 1
        ) IS NOT NULL THEN true ELSE false END as has_session
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.partner_id = $1
        AND a.appointment_date >= CURRENT_DATE
        AND a.appointment_date < CURRENT_DATE + INTERVAL '${daysAhead} days'
        AND a.status != 'cancelled'
      ORDER BY a.appointment_date ASC
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }
}

module.exports = Appointment;

