const db = require('../config/database');

class Admin {
  /**
   * Create a new admin
   * @param {Object} adminData - Admin data (name, email)
   * @param {Object} client - Optional database client for transactions
   * @returns {Object} Created admin record
   */
  static async create(adminData, client = null) {
    const { name, email } = adminData;
    const query = `
      INSERT INTO admins (name, email)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [name, email];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find admin by ID
   * @param {number} id - Admin ID
   * @returns {Object|null} Admin record or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM admins WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find admin by email
   * @param {string} email - Admin email
   * @returns {Object|null} Admin record or null
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM admins WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get all admins
   * @returns {Array} Array of admin records
   */
  static async getAll() {
    const query = 'SELECT id, name, email, created_at FROM admins ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Update admin details
   * @param {number} id - Admin ID
   * @param {Object} adminData - Updated admin data
   * @returns {Object} Updated admin record
   */
  static async update(id, adminData) {
    const { name, email, support_display_name, support_photo_url } = adminData;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (support_display_name !== undefined) {
      updates.push(`support_display_name = $${paramIndex++}`);
      values.push(support_display_name);
    }
    if (support_photo_url !== undefined) {
      updates.push(`support_photo_url = $${paramIndex++}`);
      values.push(support_photo_url);
    }

    if (updates.length === 0) {
      // No updates to make, return current record
      return await this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE admins 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete admin
   * @param {number} id - Admin ID
   * @returns {Object} Deleted admin record
   */
  static async delete(id) {
    const query = 'DELETE FROM admins WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get admin activity log (organizations deactivated by this admin)
   * @param {number} adminId - Admin ID
   * @returns {Array} Array of organization records
   */
  static async getActivityLog(adminId) {
    const query = `
      SELECT id, name, email, deactivated_at, is_active
      FROM organizations
      WHERE deactivated_by = $1
      ORDER BY deactivated_at DESC
    `;
    const result = await db.query(query, [adminId]);
    return result.rows;
  }
}

module.exports = Admin;

