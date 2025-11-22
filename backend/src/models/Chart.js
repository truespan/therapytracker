const db = require('../config/database');

class Chart {
  static async create(chartData) {
    const { partner_id, user_id, chart_type, selected_sessions } = chartData;
    const query = `
      INSERT INTO shared_charts (partner_id, user_id, chart_type, selected_sessions)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const selectedSessionsJson = selected_sessions ? JSON.stringify(selected_sessions) : null;
    const values = [partner_id, user_id, chart_type, selectedSessionsJson];
    const result = await db.query(query, values);
    
    // Parse the JSON back for the response
    const chart = result.rows[0];
    if (chart.selected_sessions) {
      chart.selected_sessions = JSON.parse(chart.selected_sessions);
    }
    return chart;
  }

  static async findByUserId(userId) {
    const query = `
      SELECT sc.*, p.name as partner_name
      FROM shared_charts sc
      JOIN partners p ON sc.partner_id = p.id
      WHERE sc.user_id = $1
      ORDER BY sc.sent_at DESC
    `;
    const result = await db.query(query, [userId]);
    
    // Parse JSON for each chart
    return result.rows.map(chart => {
      if (chart.selected_sessions) {
        chart.selected_sessions = JSON.parse(chart.selected_sessions);
      }
      return chart;
    });
  }

  static async findByPartnerAndUser(partnerId, userId) {
    const query = `
      SELECT sc.*, u.name as user_name
      FROM shared_charts sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.partner_id = $1 AND sc.user_id = $2
      ORDER BY sc.sent_at DESC
    `;
    const result = await db.query(query, [partnerId, userId]);
    
    // Parse JSON for each chart
    return result.rows.map(chart => {
      if (chart.selected_sessions) {
        chart.selected_sessions = JSON.parse(chart.selected_sessions);
      }
      return chart;
    });
  }

  static async findById(id) {
    const query = 'SELECT * FROM shared_charts WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows[0] && result.rows[0].selected_sessions) {
      result.rows[0].selected_sessions = JSON.parse(result.rows[0].selected_sessions);
    }
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM shared_charts WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Chart;

