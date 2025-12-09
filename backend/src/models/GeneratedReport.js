const db = require('../config/database');

class GeneratedReport {
  /**
   * Create a new generated report
   * @param {Object} reportData - Report data
   * @returns {Object} Created report
   */
  static async create(reportData) {
    const {
      partner_id,
      user_id,
      template_id,
      report_name,
      client_name,
      client_age,
      client_sex,
      report_date,
      description
    } = reportData;

    const query = `
      INSERT INTO generated_reports (
        partner_id, user_id, template_id, report_name,
        client_name, client_age, client_sex, report_date, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      partner_id,
      user_id,
      template_id,
      report_name,
      client_name,
      client_age || null,
      client_sex || null,
      report_date,
      description
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all reports by partner
   * @param {number} partnerId - Partner ID
   * @returns {Array} Array of reports
   */
  static async getByPartner(partnerId) {
    const query = `
      SELECT
        gr.*,
        u.name as user_name,
        rt.name as template_name
      FROM generated_reports gr
      LEFT JOIN users u ON gr.user_id = u.id
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      WHERE gr.partner_id = $1
      ORDER BY gr.created_at DESC
    `;

    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  /**
   * Get all reports for a specific client (partner view)
   * @param {number} partnerId - Partner ID
   * @param {number} userId - User ID
   * @returns {Array} Array of reports
   */
  static async getByPartnerAndUser(partnerId, userId) {
    const query = `
      SELECT
        gr.*,
        u.name as user_name,
        rt.name as template_name
      FROM generated_reports gr
      LEFT JOIN users u ON gr.user_id = u.id
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      WHERE gr.partner_id = $1 AND gr.user_id = $2
      ORDER BY gr.created_at DESC
    `;

    const result = await db.query(query, [partnerId, userId]);
    return result.rows;
  }

  /**
   * Get shared reports for a user (client view)
   * @param {number} userId - User ID
   * @returns {Array} Array of shared reports
   */
  static async getSharedReportsByUser(userId) {
    const query = `
      SELECT
        gr.*,
        p.name as partner_name,
        rt.name as template_name
      FROM generated_reports gr
      LEFT JOIN partners p ON gr.partner_id = p.id
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      WHERE gr.user_id = $1 AND gr.is_shared = TRUE
      ORDER BY gr.shared_at DESC, gr.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get unread shared reports count for a user
   * @param {number} userId - User ID
   * @returns {number} Count of unread reports
   */
  static async getUnreadCountByUser(userId) {
    const query = `
      SELECT COUNT(*)::int as count
      FROM generated_reports
      WHERE user_id = $1 AND is_shared = TRUE
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0].count;
  }

  /**
   * Get report by ID
   * @param {number} id - Report ID
   * @returns {Object} Report object
   */
  static async findById(id) {
    const query = `
      SELECT
        gr.*,
        u.name as user_name,
        p.name as partner_name,
        rt.name as template_name
      FROM generated_reports gr
      LEFT JOIN users u ON gr.user_id = u.id
      LEFT JOIN partners p ON gr.partner_id = p.id
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      WHERE gr.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update a report
   * @param {number} id - Report ID
   * @param {Object} reportData - Updated report data
   * @returns {Object} Updated report
   */
  static async update(id, reportData) {
    const {
      report_name,
      client_name,
      client_age,
      client_sex,
      report_date,
      description
    } = reportData;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (report_name !== undefined) {
      updates.push(`report_name = $${paramIndex++}`);
      values.push(report_name);
    }
    if (client_name !== undefined) {
      updates.push(`client_name = $${paramIndex++}`);
      values.push(client_name);
    }
    if (client_age !== undefined) {
      updates.push(`client_age = $${paramIndex++}`);
      values.push(client_age);
    }
    if (client_sex !== undefined) {
      updates.push(`client_sex = $${paramIndex++}`);
      values.push(client_sex);
    }
    if (report_date !== undefined) {
      updates.push(`report_date = $${paramIndex++}`);
      values.push(report_date);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE generated_reports
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Share report with client
   * @param {number} id - Report ID
   * @returns {Object} Updated report
   */
  static async share(id) {
    const query = `
      UPDATE generated_reports
      SET is_shared = TRUE, shared_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Unshare report from client
   * @param {number} id - Report ID
   * @returns {Object} Updated report
   */
  static async unshare(id) {
    const query = `
      UPDATE generated_reports
      SET is_shared = FALSE, shared_at = NULL
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete a report
   * @param {number} id - Report ID
   * @returns {Object} Deleted report
   */
  static async delete(id) {
    const query = 'DELETE FROM generated_reports WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = GeneratedReport;
