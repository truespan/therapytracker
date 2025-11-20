const db = require('../config/database');

class Profile {
  static async createField(fieldData) {
    const { field_name, field_type, category, is_default, created_by_user_id, created_by_partner_id, user_id, session_id } = fieldData;
    const query = `
      INSERT INTO profile_fields (field_name, field_type, category, is_default, created_by_user_id, created_by_partner_id, user_id, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      field_name, 
      field_type, 
      category, 
      is_default || false, 
      created_by_user_id, 
      created_by_partner_id,
      user_id || null,
      session_id || null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getAllFields(sessionId = null, userId = null) {
    let query;
    let values = [];
    
    if (sessionId && userId) {
      // Return default fields + session-specific custom fields for this user
      query = `
        SELECT * FROM profile_fields 
        WHERE (is_default = true) 
           OR (is_default = false AND user_id = $1 AND session_id = $2)
        ORDER BY is_default DESC, created_at ASC
      `;
      values = [userId, sessionId];
    } else {
      // Return all fields (for backward compatibility)
      query = 'SELECT * FROM profile_fields ORDER BY is_default DESC, created_at ASC';
    }
    
    const result = await db.query(query, values);
    return result.rows;
  }

  static async getFieldsBySession(userId, sessionId) {
    // Returns all default fields + custom fields for this specific user and session
    // Important: Custom fields must have BOTH user_id AND session_id matching
    // This ensures fields from other sessions don't leak through
    const query = `
      SELECT * FROM profile_fields 
      WHERE (is_default = true) 
         OR (is_default = false AND user_id = $1 AND session_id = $2 AND user_id IS NOT NULL AND session_id IS NOT NULL)
      ORDER BY is_default DESC, category ASC, created_at ASC
    `;
    const result = await db.query(query, [userId, sessionId]);
    return result.rows;
  }

  static async getFieldById(id) {
    const query = 'SELECT * FROM profile_fields WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async saveUserProfile(profileData) {
    const { user_id, session_id, field_id, rating_value } = profileData;
    const query = `
      INSERT INTO user_profiles (user_id, session_id, field_id, rating_value)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [user_id, session_id, field_id, rating_value];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getUserProfileBySession(userId, sessionId) {
    const query = `
      SELECT up.*, pf.field_name, pf.field_type, pf.category
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      WHERE up.user_id = $1 AND up.session_id = $2
      ORDER BY pf.id
    `;
    const result = await db.query(query, [userId, sessionId]);
    return result.rows;
  }

  static async getUserLatestProfile(userId) {
    const query = `
      SELECT up.*, pf.field_name, pf.field_type, pf.category, s.session_number
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      JOIN sessions s ON up.session_id = s.id
      WHERE up.user_id = $1 AND up.session_id = (
        SELECT MAX(session_id) FROM user_profiles WHERE user_id = $1
      )
      ORDER BY pf.id
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getAllUserProfiles(userId) {
    const query = `
      SELECT up.*, pf.field_name, pf.field_type, pf.category, s.session_number, s.session_date
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      JOIN sessions s ON up.session_id = s.id
      WHERE up.user_id = $1
      ORDER BY s.session_number, pf.id
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getUserProfileHistory(userId) {
    const query = `
      SELECT 
        s.id as session_id,
        s.session_number,
        s.session_date,
        json_agg(
          json_build_object(
            'field_id', pf.id,
            'field_name', pf.field_name,
            'field_type', pf.field_type,
            'category', pf.category,
            'rating_value', up.rating_value
          ) ORDER BY pf.id
        ) as ratings
      FROM sessions s
      LEFT JOIN user_profiles up ON s.id = up.session_id
      LEFT JOIN profile_fields pf ON up.field_id = pf.id
      WHERE s.user_id = $1 AND s.completed = true
      GROUP BY s.id, s.session_number, s.session_date
      ORDER BY s.session_number
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = Profile;

