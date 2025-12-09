const db = require('../config/database');

class TherapySession {
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
      payment_notes
    } = sessionData;

    const query = `
      INSERT INTO therapy_sessions (
        appointment_id, partner_id, user_id,
        session_title, session_date, session_duration, session_notes, payment_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      payment_notes || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Create standalone session (no appointment required)
  static async createStandalone(sessionData) {
    const { partner_id, user_id, session_title, session_date, session_duration, session_notes, payment_notes, video_session_id } = sessionData;

    const query = `
      INSERT INTO therapy_sessions (partner_id, user_id, session_title, session_date, session_duration, session_notes, payment_notes, video_session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [partner_id, user_id, session_title, session_date, session_duration || null, session_notes || null, payment_notes || null, video_session_id || null];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find session by ID
  static async findById(id) {
    const query = 'SELECT * FROM therapy_sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find session by appointment ID
  static async findByAppointmentId(appointmentId) {
    const query = 'SELECT * FROM therapy_sessions WHERE appointment_id = $1';
    const result = await db.query(query, [appointmentId]);
    return result.rows[0];
  }

  // Get all sessions for a partner
  static async findByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT ts.*,
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
               ts.session_date, ts.session_duration, ts.session_notes, ts.payment_notes,
               ts.created_at, ts.updated_at, u.name, a.appointment_date, a.title
      ORDER BY ts.session_date DESC
    `;
    const result = await db.query(query, [partnerId, userId]);
    return result.rows;
  }

  // Get all sessions for a user
  static async findByUser(userId) {
    const query = `
      SELECT ts.*,
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
    const { session_title, session_date, session_duration, session_notes, payment_notes } = sessionData;

    // Build dynamic query to handle explicit null values for session_notes
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
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    // Check if session_notes was explicitly provided in the request
    const sessionNotesProvided = sessionData.hasOwnProperty('session_notes');
    const values = [session_title, session_date, session_duration, session_notes, payment_notes, id, sessionNotesProvided];
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

  // Delete a session
  static async delete(id) {
    const query = 'DELETE FROM therapy_sessions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = TherapySession;
 
