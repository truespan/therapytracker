const db = require('../config/database');

class Chart {
  // Create a questionnaire comparison chart
  static async createQuestionnaireChart(chartData) {
    const {
      partner_id,
      user_id,
      questionnaire_id,
      selected_assignments,
      chart_display_type
    } = chartData;

    const query = `
      INSERT INTO shared_charts (
        partner_id, user_id, chart_type, questionnaire_id,
        selected_assignments, chart_display_type
      )
      VALUES ($1, $2, 'questionnaire_comparison', $3, $4, $5)
      RETURNING *
    `;
    const selectedAssignmentsJson = selected_assignments ? JSON.stringify(selected_assignments) : null;
    const values = [partner_id, user_id, questionnaire_id, selectedAssignmentsJson, chart_display_type || 'radar'];
    const result = await db.query(query, values);

    const chart = result.rows[0];
    if (chart.selected_assignments) {
      chart.selected_assignments = JSON.parse(chart.selected_assignments);
    }
    return chart;
  }

  // Legacy method for session-based charts (kept for backwards compatibility)
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
      SELECT sc.*, p.name as partner_name, q.name as questionnaire_name
      FROM shared_charts sc
      JOIN partners p ON sc.partner_id = p.id
      LEFT JOIN questionnaires q ON sc.questionnaire_id = q.id
      WHERE sc.user_id = $1
      ORDER BY sc.sent_at DESC
    `;
    const result = await db.query(query, [userId]);

    // Parse JSON for each chart
    return result.rows.map(chart => {
      if (chart.selected_sessions) {
        chart.selected_sessions = JSON.parse(chart.selected_sessions);
      }
      if (chart.selected_assignments) {
        chart.selected_assignments = JSON.parse(chart.selected_assignments);
      }
      return chart;
    });
  }

  static async findByPartnerAndUser(partnerId, userId) {
    const query = `
      SELECT sc.*, u.name as user_name, q.name as questionnaire_name
      FROM shared_charts sc
      JOIN users u ON sc.user_id = u.id
      LEFT JOIN questionnaires q ON sc.questionnaire_id = q.id
      WHERE sc.partner_id = $1 AND sc.user_id = $2
      ORDER BY sc.sent_at DESC
    `;
    const result = await db.query(query, [partnerId, userId]);

    // Parse JSON for each chart
    return result.rows.map(chart => {
      if (chart.selected_sessions) {
        chart.selected_sessions = JSON.parse(chart.selected_sessions);
      }
      if (chart.selected_assignments) {
        chart.selected_assignments = JSON.parse(chart.selected_assignments);
      }
      return chart;
    });
  }

  static async findById(id) {
    const query = `
      SELECT sc.*, q.name as questionnaire_name
      FROM shared_charts sc
      LEFT JOIN questionnaires q ON sc.questionnaire_id = q.id
      WHERE sc.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows[0]) {
      if (result.rows[0].selected_sessions) {
        result.rows[0].selected_sessions = JSON.parse(result.rows[0].selected_sessions);
      }
      if (result.rows[0].selected_assignments) {
        result.rows[0].selected_assignments = JSON.parse(result.rows[0].selected_assignments);
      }
    }
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM shared_charts WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Verify that a chart belongs to a specific partner
  static async verifyPartnerOwnership(chartId, partnerId) {
    const query = 'SELECT id FROM shared_charts WHERE id = $1 AND partner_id = $2';
    const result = await db.query(query, [chartId, partnerId]);
    return result.rows.length > 0;
  }
}

module.exports = Chart;
