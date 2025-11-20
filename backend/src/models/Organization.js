const db = require('../config/database');

class Organization {
  static async create(orgData, client = null) {
    const { name, date_of_creation, email, contact, address, photo_url, gst_no, subscription_plan } = orgData;
    const query = `
      INSERT INTO organizations (name, date_of_creation, email, contact, address, photo_url, gst_no, subscription_plan, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      name, 
      date_of_creation || new Date(), 
      email, 
      contact, 
      address, 
      photo_url, 
      gst_no || null,
      subscription_plan || null,
      true
    ];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM organizations WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM organizations WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT id, name, email, contact, address FROM organizations ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  static async update(id, orgData) {
    const { name, email, contact, address, photo_url, gst_no, subscription_plan } = orgData;
    const query = `
      UPDATE organizations 
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          contact = COALESCE($3, contact),
          address = COALESCE($4, address),
          photo_url = COALESCE($5, photo_url),
          gst_no = COALESCE($6, gst_no),
          subscription_plan = COALESCE($7, subscription_plan)
      WHERE id = $8
      RETURNING *
    `;
    const values = [name, email, contact, address, photo_url, gst_no, subscription_plan, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM organizations WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getPartners(orgId) {
    const query = 'SELECT * FROM partners WHERE organization_id = $1';
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  static async getAllUsers(orgId) {
    const query = `
      SELECT DISTINCT u.* FROM users u
      JOIN user_partner_assignments upa ON u.id = upa.user_id
      JOIN partners p ON upa.partner_id = p.id
      WHERE p.organization_id = $1
    `;
    const result = await db.query(query, [orgId]);
    return result.rows;
  }

  /**
   * Deactivate an organization
   * @param {number} id - Organization ID
   * @param {number} adminId - Admin ID who is deactivating
   * @returns {Object} Updated organization record
   */
  static async deactivate(id, adminId) {
    const query = `
      UPDATE organizations 
      SET is_active = FALSE,
          deactivated_at = CURRENT_TIMESTAMP,
          deactivated_by = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, adminId]);
    return result.rows[0];
  }

  /**
   * Activate an organization
   * @param {number} id - Organization ID
   * @returns {Object} Updated organization record
   */
  static async activate(id) {
    const query = `
      UPDATE organizations 
      SET is_active = TRUE,
          deactivated_at = NULL,
          deactivated_by = NULL
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get metrics for a specific organization
   * @param {number} id - Organization ID
   * @returns {Object} Organization metrics
   */
  static async getMetrics(id) {
    const query = `
      WITH partner_count AS (
        SELECT COUNT(*)::int as total_partners
        FROM partners
        WHERE organization_id = $1
      ),
      client_count AS (
        SELECT COUNT(DISTINCT u.id)::int as total_clients
        FROM users u
        JOIN user_partner_assignments upa ON u.id = upa.user_id
        JOIN partners p ON upa.partner_id = p.id
        WHERE p.organization_id = $1
      ),
      session_stats AS (
        SELECT 
          COUNT(*)::int as total_sessions,
          COUNT(*) FILTER (WHERE completed = TRUE)::int as completed_sessions,
          COUNT(*) FILTER (WHERE completed = FALSE)::int as active_sessions,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM sessions s
        JOIN partners p ON s.partner_id = p.id
        WHERE p.organization_id = $1
      )
      SELECT 
        pc.total_partners,
        cc.total_clients,
        ss.total_sessions,
        ss.completed_sessions,
        ss.active_sessions,
        ss.sessions_this_month
      FROM partner_count pc, client_count cc, session_stats ss
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || {
      total_partners: 0,
      total_clients: 0,
      total_sessions: 0,
      completed_sessions: 0,
      active_sessions: 0,
      sessions_this_month: 0
    };
  }

  /**
   * Get all organizations with their metrics
   * @returns {Array} Array of organizations with metrics
   */
  static async getAllWithMetrics() {
    const query = `
      WITH org_metrics AS (
        SELECT 
          o.id,
          o.name,
          o.email,
          o.contact,
          o.address,
          o.gst_no,
          o.subscription_plan,
          o.is_active,
          o.deactivated_at,
          o.deactivated_by,
          o.created_at,
          COUNT(DISTINCT p.id)::int as total_partners,
          COUNT(DISTINCT u.id)::int as total_clients,
          COUNT(DISTINCT s.id)::int as total_sessions,
          COUNT(DISTINCT s.id) FILTER (WHERE s.completed = TRUE)::int as completed_sessions,
          COUNT(DISTINCT s.id) FILTER (WHERE s.completed = FALSE)::int as active_sessions,
          COUNT(DISTINCT s.id) FILTER (WHERE DATE_TRUNC('month', s.session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM organizations o
        LEFT JOIN partners p ON o.id = p.organization_id
        LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
        LEFT JOIN users u ON upa.user_id = u.id
        LEFT JOIN sessions s ON p.id = s.partner_id
        GROUP BY o.id, o.name, o.email, o.contact, o.address, o.gst_no, 
                 o.subscription_plan, o.is_active, o.deactivated_at, 
                 o.deactivated_by, o.created_at
      )
      SELECT 
        om.*,
        a.name as deactivated_by_name
      FROM org_metrics om
      LEFT JOIN admins a ON om.deactivated_by = a.id
      ORDER BY om.name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get partner breakdown for organization
   * @param {number} id - Organization ID
   * @returns {Array} Partner statistics
   */
  static async getPartnerBreakdown(id) {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.partner_id,
        p.email,
        COUNT(DISTINCT upa.user_id)::int as total_clients,
        COUNT(DISTINCT s.id)::int as total_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.completed = TRUE)::int as completed_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE DATE_TRUNC('month', s.session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
      FROM partners p
      LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
      LEFT JOIN sessions s ON p.id = s.partner_id
      WHERE p.organization_id = $1
      GROUP BY p.id, p.name, p.partner_id, p.email
      ORDER BY p.name
    `;
    const result = await db.query(query, [id]);
    return result.rows;
  }
}

module.exports = Organization;

