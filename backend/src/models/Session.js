const db = require('../config/database');

class Session {
  static async create(sessionData) {
    const { user_id, partner_id, session_number, session_date, feedback_text, rating } = sessionData;
    const query = `
      INSERT INTO sessions (user_id, partner_id, session_number, session_date, feedback_text, rating, completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      user_id, 
      partner_id, 
      session_number, 
      session_date || new Date(), 
      feedback_text, 
      rating,
      false
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM sessions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByUser(userId) {
    const query = `
      SELECT s.*, p.name as partner_name
      FROM sessions s
      JOIN partners p ON s.partner_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.session_number DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findByPartner(partnerId) {
    const query = `
      SELECT s.*, u.name as user_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.partner_id = $1
      ORDER BY s.session_date DESC
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  static async update(id, sessionData) {
    const { feedback_text, rating, completed, main_issue } = sessionData;
    const query = `
      UPDATE sessions 
      SET feedback_text = COALESCE($1, feedback_text),
          rating = COALESCE($2, rating),
          completed = COALESCE($3, completed),
          main_issue = COALESCE($4, main_issue)
      WHERE id = $5
      RETURNING *
    `;
    const values = [feedback_text, rating, completed, main_issue, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM sessions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getNextSessionNumber(userId) {
    const query = `
      SELECT COALESCE(MAX(session_number), 0) + 1 as next_number
      FROM sessions
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0].next_number;
  }

  static async findIncompleteSessionByUser(userId) {
    const query = `
      SELECT * FROM sessions
      WHERE user_id = $1 AND completed = false
      ORDER BY session_number DESC
      LIMIT 1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }
}

module.exports = Session;

