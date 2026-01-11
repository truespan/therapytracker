const db = require('../config/database');
const bcrypt = require('bcrypt');

class VideoSession {
  // Generate unique meeting room ID
  static generateMeetingRoomId(partnerId, userId) {
    const timestamp = Date.now();
    return `therapy-${partnerId}-${userId}-${timestamp}`;
  }

  // Generate random 6-digit password
  static generatePassword() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash password for storage
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async create(sessionData) {
    const {
      partner_id,
      user_id,
      title,
      session_date,
      end_date,
      duration_minutes,
      password_enabled,
      notes,
      timezone,
      meet_link,
      status,
      therapy_session_id
    } = sessionData;

    // Generate meeting room ID
    const meeting_room_id = this.generateMeetingRoomId(partner_id, user_id);

    // Generate and hash password if enabled
    let password = null;
    let plainPassword = null;
    if (password_enabled) {
      plainPassword = this.generatePassword();
      password = await this.hashPassword(plainPassword);
    }

    // Determine status: if end_date has passed, set to 'completed', otherwise use provided status or default to 'scheduled'
    let sessionStatus = status || 'scheduled';
    if (end_date) {
      const endDate = new Date(end_date);
      const now = new Date();
      if (endDate < now) {
        sessionStatus = 'completed';
      }
    }

    const query = `
      INSERT INTO video_sessions (
        partner_id, user_id, title, session_date, end_date,
        duration_minutes, meeting_room_id, password, password_enabled, notes, timezone, meet_link, status, therapy_session_id
      )
      VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      partner_id,
      user_id,
      title,
      session_date,
      end_date,
      duration_minutes || 60,
      meeting_room_id,
      password,
      password_enabled !== false, // Default to true
      notes,
      timezone || 'UTC',
      meet_link || null,
      sessionStatus,
      therapy_session_id || null
    ];

    const result = await db.query(query, values);
    const session = result.rows[0];

    // Return session with plain password (only on creation)
    return {
      ...session,
      plain_password: plainPassword
    };
  }

  static async findById(id) {
    const query = `
      SELECT 
        vs.*,
        u.name as user_name,
        u.email as user_email,
        p.name as partner_name,
        p.email as partner_email
      FROM video_sessions vs
      JOIN users u ON vs.user_id = u.id
      JOIN partners p ON vs.partner_id = p.id
      WHERE vs.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT
        vs.*,
        u.name as user_name,
        u.email as user_email,
        COALESCE(ts.id, vs.therapy_session_id) as therapy_session_id,
        ts.status as therapy_session_status,
        CASE WHEN (ts.id IS NOT NULL OR vs.therapy_session_id IS NOT NULL) THEN true ELSE false END as has_therapy_session
      FROM video_sessions vs
      JOIN users u ON vs.user_id = u.id
      LEFT JOIN therapy_sessions ts ON vs.id = ts.video_session_id
      WHERE vs.partner_id = $1
    `;
    const values = [partnerId];

    if (startDate && endDate) {
      query += ` AND vs.session_date >= $2 AND vs.session_date <= $3`;
      values.push(startDate, endDate);
    }

    query += ` ORDER BY vs.session_date DESC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  static async findByUser(userId, partnerId = null) {
    let query = `
      SELECT 
        vs.*, 
        p.name as partner_name, 
        p.email as partner_email,
        COALESCE(ts.id, vs.therapy_session_id) as therapy_session_id,
        ts.status as therapy_session_status,
        CASE WHEN (ts.id IS NOT NULL OR vs.therapy_session_id IS NOT NULL) THEN true ELSE false END as has_therapy_session
      FROM video_sessions vs
      JOIN partners p ON vs.partner_id = p.id
      LEFT JOIN therapy_sessions ts ON vs.id = ts.video_session_id
      WHERE vs.user_id = $1 AND vs.status IN ('scheduled', 'in_progress')
    `;
    const values = [userId];
    
    if (partnerId) {
      query += ` AND vs.partner_id = $2`;
      values.push(partnerId);
    }
    
    query += ` ORDER BY vs.session_date ASC`;
    
    const result = await db.query(query, values);
    return result.rows;
  }

  static async update(id, sessionData) {
    const {
      title,
      session_date,
      end_date,
      duration_minutes,
      status,
      notes,
      password_enabled,
      timezone,
      meet_link
    } = sessionData;

    const query = `
      UPDATE video_sessions
      SET title = COALESCE($1, title),
          session_date = COALESCE($2::timestamptz, session_date),
          end_date = COALESCE($3::timestamptz, end_date),
          duration_minutes = COALESCE($4, duration_minutes),
          status = COALESCE($5, status),
          notes = COALESCE($6, notes),
          password_enabled = COALESCE($7, password_enabled),
          timezone = COALESCE($8, timezone),
          meet_link = COALESCE($9, meet_link),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const values = [title, session_date, end_date, duration_minutes, status, notes, password_enabled, timezone, meet_link, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM video_sessions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async checkConflict(partnerId, sessionDate, endDate, excludeId = null) {
    // Check conflicts with other video sessions
    // Only check conflicts with active sessions (scheduled or in_progress), not completed or cancelled
    let videoQuery = `
      SELECT * FROM video_sessions
      WHERE partner_id = $1
      AND status IN ('scheduled', 'in_progress')
      AND (
        (session_date <= $2 AND end_date > $2)
        OR (session_date < $3 AND end_date >= $3)
        OR (session_date >= $2 AND end_date <= $3)
      )
    `;
    const videoValues = [partnerId, sessionDate, endDate];

    if (excludeId) {
      videoQuery += ` AND id != $4`;
      videoValues.push(excludeId);
    }

    const videoResult = await db.query(videoQuery, videoValues);
    if (videoResult.rows.length > 0) {
      return true;
    }

    // Check conflicts with appointments
    // Only check conflicts with active appointments (scheduled), not completed or cancelled
    const appointmentQuery = `
      SELECT * FROM appointments
      WHERE partner_id = $1
      AND status = 'scheduled'
      AND (
        (appointment_date <= $2 AND end_date > $2)
        OR (appointment_date < $3 AND end_date >= $3)
        OR (appointment_date >= $2 AND end_date <= $3)
      )
    `;
    const appointmentResult = await db.query(appointmentQuery, [partnerId, sessionDate, endDate]);
    return appointmentResult.rows.length > 0;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE video_sessions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  // Mark expired video sessions as completed
  static async markExpiredSessionsAsCompleted() {
    const query = `
      UPDATE video_sessions
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE end_date < CURRENT_TIMESTAMP
      AND status IN ('scheduled', 'in_progress')
      RETURNING id
    `;
    const result = await db.query(query);
    return result.rows.length;
  }
}

module.exports = VideoSession;
