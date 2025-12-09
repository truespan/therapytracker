const db = require('../config/database');

class ReportTemplate {
  /**
   * Create a new report template
   * @param {Object} templateData - Template data
   * @returns {Object} Created template
   */
  static async create(templateData) {
    const { name, description, file_path, file_name, file_size, uploaded_by } = templateData;

    const query = `
      INSERT INTO report_templates (name, description, file_path, file_name, file_size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [name, description || null, file_path, file_name, file_size || null, uploaded_by];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all report templates
   * @returns {Array} Array of templates
   */
  static async getAll() {
    const query = `
      SELECT
        rt.*,
        a.name as uploaded_by_name
      FROM report_templates rt
      LEFT JOIN admins a ON rt.uploaded_by = a.id
      ORDER BY rt.created_at DESC
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get report template by ID
   * @param {number} id - Template ID
   * @returns {Object} Template object
   */
  static async findById(id) {
    const query = `
      SELECT
        rt.*,
        a.name as uploaded_by_name
      FROM report_templates rt
      LEFT JOIN admins a ON rt.uploaded_by = a.id
      WHERE rt.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update a report template
   * @param {number} id - Template ID
   * @param {Object} templateData - Updated template data
   * @returns {Object} Updated template
   */
  static async update(id, templateData) {
    const { name, description } = templateData;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
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
      UPDATE report_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a report template
   * @param {number} id - Template ID
   * @returns {Object} Deleted template
   */
  static async delete(id) {
    const query = 'DELETE FROM report_templates WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Count total templates
   * @returns {number} Total count
   */
  static async count() {
    const query = 'SELECT COUNT(*)::int as count FROM report_templates';
    const result = await db.query(query);
    return result.rows[0].count;
  }

  /**
   * Check if max template limit (5) is reached
   * @returns {boolean} True if limit reached
   */
  static async isMaxLimitReached() {
    const count = await this.count();
    return count >= 5;
  }
}

module.exports = ReportTemplate;
