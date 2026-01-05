const db = require('../config/database');

class TherapySession {
  // Get the next session number for a user-partner pair
  static async getNextSessionNumber(partnerId, userId) {
    const query = `
      SELECT COALESCE(MAX(session_number), 0) + 1 as next_session_number
      FROM therapy_sessions
      WHERE partner_id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [partnerId, userId]);
    return result.rows[0].next_session_number;
  }

  // Create a new therapy session from an appointment
  static async create(sessionData) {
    const {
      appointment_id,
      partner_id,
      user_id,
      session_title,
      session_date,
      session_duration,
      session_notes,
      payment_notes,
      google_drive_link,
      status
    } = sessionData;

    // Get the next session number for this user-partner pair
    const session_number = await this.getNextSessionNumber(partner_id, user_id);

    // Determine status: if appointment end_date has passed, set to 'completed', otherwise use provided status or default to 'scheduled'
    let sessionStatus = status || 'scheduled';
    if (appointment_id) {
      // Check if appointment end_date has passed
      const appointmentQuery = 'SELECT end_date FROM appointments WHERE id = $1';
      const appointmentResult = await db.query(appointmentQuery, [appointment_id]);
      if (appointmentResult.rows.length > 0 && appointmentResult.rows[0].end_date) {
        const endDate = new Date(appointmentResult.rows[0].end_date);
        const now = new Date();
        if (endDate < now) {
          sessionStatus = 'completed';
        }
      }
    }

    const query = `
      INSERT INTO therapy_sessions (
        appointment_id, partner_id, user_id,
        session_title, session_date, session_duration, session_notes, payment_notes, google_drive_link, session_number, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      appointment_id || null,
      partner_id,
      user_id,
      session_title,
      session_date,
      session_duration || null,
      session_notes || null,
      payment_notes || null,
      google_drive_link || null,
      session_number,
      sessionStatus
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Create standalone session (no appointment required)
  static async createStandalone(sessionData) {
    const { partner_id, user_id, session_title, session_date, session_duration, session_notes, payment_notes, google_drive_link, video_session_id, status } = sessionData;

    // Get the next session number for this user-partner pair
    const session_number = await this.getNextSessionNumber(partner_id, user_id);

    // Determine status: if session_date + session_duration has passed, set to 'completed', otherwise use provided status or default to 'scheduled'
    let sessionStatus = status || 'scheduled';
    if (session_date && session_duration) {
      const sessionDate = new Date(session_date);
      const endDate = new Date(sessionDate.getTime() + session_duration * 60000); // Add duration in milliseconds
      const now = new Date();
      if (endDate < now) {
        sessionStatus = 'completed';
      }
    }

    const query = `
      INSERT INTO therapy_sessions (partner_id, user_id, session_title, session_date, session_duration, session_notes, payment_notes, google_drive_link, video_session_id, session_number, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [partner_id, user_id, session_title, session_date, session_duration || null, session_notes || null, payment_notes || null, google_drive_link || null, video_session_id || null, session_number, sessionStatus];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find session by ID
  static async findById(id) {
    const query = `
      SELECT 
        ts.id,
        ts.appointment_id,
        ts.video_session_id,
        ts.partner_id,
        ts.user_id,
        ts.session_title,
        ts.session_date,
        ts.session_duration,
        ts.session_notes,
        ts.payment_notes,
        ts.google_drive_link,
        ts.session_number,
        CASE
          WHEN ts.status = 'cancelled' THEN 'cancelled'
          WHEN ts.status = 'completed' THEN 'completed'
          WHEN (
            (ts.session_date + (COALESCE(ts.session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
            OR
            (ts.appointment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM appointments a 
              WHERE a.id = ts.appointment_id 
              AND a.end_date < CURRENT_TIMESTAMP
            ))
          ) THEN 'completed'
          ELSE ts.status
        END as status,
        ts.created_at,
        ts.updated_at
      FROM therapy_sessions ts
      WHERE ts.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find session by appointment ID
  static async findByAppointmentId(appointmentId) {
    const query = `
      SELECT 
        ts.id,
        ts.appointment_id,
        ts.video_session_id,
        ts.partner_id,
        ts.user_id,
        ts.session_title,
        ts.session_date,
        ts.session_duration,
        ts.session_notes,
        ts.payment_notes,
        ts.google_drive_link,
        ts.session_number,
        CASE
          WHEN ts.status = 'cancelled' THEN 'cancelled'
          WHEN ts.status = 'completed' THEN 'completed'
          WHEN (
            (ts.session_date + (COALESCE(ts.session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
            OR
            (ts.appointment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM appointments a 
              WHERE a.id = ts.appointment_id 
              AND a.end_date < CURRENT_TIMESTAMP
            ))
          ) THEN 'completed'
          ELSE ts.status
        END as status,
        ts.created_at,
        ts.updated_at
      FROM therapy_sessions ts
      WHERE ts.appointment_id = $1
    `;
    const result = await db.query(query, [appointmentId]);
    return result.rows[0];
  }

  // Get all sessions for a partner
  static async findByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        ts.id,
        ts.appointment_id,
        ts.video_session_id,
        ts.partner_id,
        ts.user_id,
        ts.session_title,
        ts.session_date,
        ts.session_duration,
        ts.session_notes,
        ts.payment_notes,
        ts.google_drive_link,
        ts.session_number,
        CASE
          WHEN ts.status = 'cancelled' THEN 'cancelled'
          WHEN ts.status = 'completed' THEN 'completed'
          WHEN (
            (ts.session_date + (COALESCE(ts.session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
            OR
            (ts.appointment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM appointments a 
              WHERE a.id = ts.appointment_id 
              AND a.end_date < CURRENT_TIMESTAMP
            ))
          ) THEN 'completed'
          ELSE ts.status
        END as status,
        ts.created_at,
        ts.updated_at,
        u.name as user_name,
        u.email as user_email,
        a.appointment_date,
        a.title as appointment_title
      FROM therapy_sessions ts
      JOIN users u ON ts.user_id = u.id
      LEFT JOIN appointments a ON ts.appointment_id = a.id
      WHERE ts.partner_id = $1
    `;
    const values = [partnerId];

    if (startDate && endDate) {
      query += ` AND ts.created_at >= $2 AND ts.created_at <= $3`;
      values.push(startDate, endDate);
    }

    query += ` ORDER BY ts.session_date DESC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  // Get sessions for specific partner-user pair (sorted newest first)
  static async findByPartnerAndUser(partnerId, userId) {
    const query = `
      SELECT
        ts.id,
        ts.appointment_id,
        ts.video_session_id,
        ts.partner_id,
        ts.user_id,
        ts.session_title,
        ts.session_date,
        ts.session_duration,
        ts.session_notes,
        ts.payment_notes,
        ts.google_drive_link,
        ts.session_number,
        ts.status,
        CASE
          WHEN ts.status = 'cancelled' THEN 'cancelled'
          WHEN ts.status = 'completed' THEN 'completed'
          WHEN (
            (ts.session_date + (COALESCE(ts.session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
            OR
            (ts.appointment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM appointments a 
              WHERE a.id = ts.appointment_id 
              AND a.end_date < CURRENT_TIMESTAMP
            ))
          ) THEN 'completed'
          ELSE ts.status
        END as computed_status,
        ts.created_at,
        ts.updated_at,
        u.name as user_name,
        a.appointment_date,
        a.title as appointment_title,
        CASE WHEN ts.appointment_id IS NOT NULL THEN true ELSE false END as from_appointment,
        CASE WHEN ts.video_session_id IS NOT NULL THEN true ELSE false END as from_video_session,
        COALESCE(
          json_agg(
            json_build_object(
              'id', q.id,
              'name', q.name,
              'assignment_id', uqa.id,
              'status', uqa.status
            ) ORDER BY sqa.assigned_at
          ) FILTER (WHERE q.id IS NOT NULL),
          '[]'::json
        ) as assigned_questionnaires
      FROM therapy_sessions ts
      JOIN users u ON ts.user_id = u.id
      LEFT JOIN appointments a ON ts.appointment_id = a.id
      LEFT JOIN session_questionnaire_assignments sqa ON ts.id = sqa.therapy_session_id
      LEFT JOIN user_questionnaire_assignments uqa ON sqa.user_questionnaire_assignment_id = uqa.id
      LEFT JOIN questionnaires q ON uqa.questionnaire_id = q.id
      WHERE ts.partner_id = $1 AND ts.user_id = $2
      GROUP BY ts.id, ts.appointment_id, ts.video_session_id, ts.partner_id, ts.user_id, ts.session_title,
               ts.session_date, ts.session_duration, ts.session_notes, ts.payment_notes, ts.google_drive_link, ts.session_number,
               ts.status, ts.created_at, ts.updated_at, u.name, a.appointment_date, a.title
      ORDER BY ts.session_date DESC
    `;
    const result = await db.query(query, [partnerId, userId]);
    
    // Replace status with computed_status in the results
    return result.rows.map(row => ({
      ...row,
      status: row.computed_status,
      computed_status: undefined
    }));
  }

  // Get all sessions for a user
  static async findByUser(userId) {
    const query = `
      SELECT 
        ts.id,
        ts.appointment_id,
        ts.video_session_id,
        ts.partner_id,
        ts.user_id,
        ts.session_title,
        ts.session_date,
        ts.session_duration,
        ts.session_notes,
        ts.payment_notes,
        ts.google_drive_link,
        ts.session_number,
        CASE
          WHEN ts.status = 'cancelled' THEN 'cancelled'
          WHEN ts.status = 'completed' THEN 'completed'
          WHEN (
            (ts.session_date + (COALESCE(ts.session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
            OR
            (ts.appointment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM appointments a 
              WHERE a.id = ts.appointment_id 
              AND a.end_date < CURRENT_TIMESTAMP
            ))
          ) THEN 'completed'
          ELSE ts.status
        END as status,
        ts.created_at,
        ts.updated_at,
        p.name as partner_name,
        a.appointment_date,
        a.title as appointment_title
      FROM therapy_sessions ts
      JOIN partners p ON ts.partner_id = p.id
      LEFT JOIN appointments a ON ts.appointment_id = a.id
      WHERE ts.user_id = $1
      ORDER BY ts.session_date DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  // Update a session
  static async update(id, sessionData) {
    const { session_title, session_date, session_duration, session_notes, payment_notes, google_drive_link, status } = sessionData;

    // Build dynamic query to handle explicit null values for session_notes
    // Check if google_drive_link was explicitly provided
    const googleDriveLinkProvided = sessionData.hasOwnProperty('google_drive_link');
    
    const query = `
      UPDATE therapy_sessions
      SET session_title = COALESCE($1, session_title),
          session_date = COALESCE($2, session_date),
          session_duration = COALESCE($3, session_duration),
          session_notes = CASE
            WHEN $7 = true THEN $4  -- If session_notes was explicitly provided, use it (even if null)
            ELSE session_notes       -- Otherwise keep existing value
          END,
          payment_notes = COALESCE($5, payment_notes),
          google_drive_link = CASE
            WHEN $10 = true THEN COALESCE($9::jsonb, '[]'::jsonb)  -- If explicitly provided, use it (convert to jsonb)
            ELSE google_drive_link  -- Otherwise keep existing value
          END,
          status = COALESCE($8, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    // Check if session_notes was explicitly provided in the request
    const sessionNotesProvided = sessionData.hasOwnProperty('session_notes');
    // Convert google_drive_link to JSON string for PostgreSQL JSONB
    // If it's an array, stringify it; if null/undefined, pass null
    const googleDriveLinkJson = google_drive_link !== undefined && google_drive_link !== null 
      ? JSON.stringify(google_drive_link) 
      : null;
    const values = [session_title, session_date, session_duration, session_notes, payment_notes, id, sessionNotesProvided, status, googleDriveLinkJson, googleDriveLinkProvided];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Assign questionnaire to session
  static async assignQuestionnaire(therapySessionId, userQuestionnaireAssignmentId) {
    const query = `
      INSERT INTO session_questionnaire_assignments (therapy_session_id, user_questionnaire_assignment_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [therapySessionId, userQuestionnaireAssignmentId]);
    return result.rows[0];
  }

  // Get questionnaires linked to session
  static async getSessionQuestionnaires(therapySessionId) {
    const query = `
      SELECT
        sqa.*,
        uqa.questionnaire_id,
        uqa.status as assignment_status,
        uqa.completed_at,
        q.name as questionnaire_name,
        q.description as questionnaire_description
      FROM session_questionnaire_assignments sqa
      JOIN user_questionnaire_assignments uqa ON sqa.user_questionnaire_assignment_id = uqa.id
      JOIN questionnaires q ON uqa.questionnaire_id = q.id
      WHERE sqa.therapy_session_id = $1
      ORDER BY sqa.assigned_at DESC
    `;
    const result = await db.query(query, [therapySessionId]);
    return result.rows;
  }

  // Remove questionnaire assignment from session
  static async removeQuestionnaireAssignment(therapySessionId, userQuestionnaireAssignmentId) {
    const query = `
      DELETE FROM session_questionnaire_assignments
      WHERE therapy_session_id = $1 AND user_questionnaire_assignment_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [therapySessionId, userQuestionnaireAssignmentId]);
    return result.rows[0];
  }

  // Delete a session - DISABLED
  // Therapy sessions cannot be deleted to maintain historical records and data integrity
  static async delete(id) {
    throw new Error('Therapy sessions cannot be deleted. They are permanent records that must be preserved for historical data integrity.');
  }

  // Mark expired therapy sessions as completed
  static async markExpiredSessionsAsCompleted() {
    const query = `
      UPDATE therapy_sessions
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('scheduled', 'started')
      AND (
        (session_date + (COALESCE(session_duration, 0) * INTERVAL '1 minute')) < CURRENT_TIMESTAMP
        OR
        (appointment_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM appointments a 
          WHERE a.id = therapy_sessions.appointment_id 
          AND a.end_date < CURRENT_TIMESTAMP
        ))
      )
      RETURNING id
    `;
    const result = await db.query(query);
    return result.rows.length;
  }

  /**
   * Count sessions for a partner within a date range
   * @param {number} partnerId - Partner ID
   * @param {Date|null} startDate - Start date (inclusive), null for no start limit
   * @param {Date|null} endDate - End date (inclusive), null for no end limit
   * @returns {Promise<number>} Count of sessions
   */
  static async countSessionsByDateRange(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT COUNT(*) as session_count
      FROM therapy_sessions
      WHERE partner_id = $1
    `;
    const values = [partnerId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND session_date >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND session_date <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].session_count, 10);
  }
}

module.exports = TherapySession;
 
