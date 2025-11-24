const db = require('../config/database');

class Profile {
  static async createField(fieldData) {
    const { field_name, field_type, category, is_default, created_by_user_id, created_by_partner_id, user_id } = fieldData;
    const query = `
      INSERT INTO profile_fields (field_name, field_type, category, is_default, created_by_user_id, created_by_partner_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      field_name, 
      field_type, 
      category, 
      is_default || false, 
      created_by_user_id, 
      created_by_partner_id,
      user_id || null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getAllFields(sessionId = null, userId = null) {
    let query;
    let values = [];
    
    if (userId) {
      // Return default fields + user-specific custom fields
      query = `
        SELECT * FROM profile_fields 
        WHERE (is_default = true) 
           OR (is_default = false AND user_id = $1)
        ORDER BY is_default DESC, created_at ASC
      `;
      values = [userId];
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
    const { user_id, field_id, rating_value } = profileData;
    const query = `
      INSERT INTO user_profiles (user_id, field_id, rating_value)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [user_id, field_id, rating_value];
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
      SELECT up.*, pf.field_name, pf.field_type, pf.category, up.recorded_at
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      WHERE up.user_id = $1 AND up.recorded_at = (
        SELECT MAX(recorded_at) FROM user_profiles WHERE user_id = $1
      )
      ORDER BY pf.id
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getAllUserProfiles(userId) {
    const query = `
      SELECT up.*, pf.field_name, pf.field_type, pf.category, up.recorded_at
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      WHERE up.user_id = $1
      ORDER BY up.recorded_at DESC, pf.id
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getUserProfileHistory(userId) {
    const query = `
      SELECT 
        DATE(up.recorded_at) as profile_date,
        MAX(up.recorded_at) as recorded_at,
        json_agg(
          json_build_object(
            'field_id', pf.id,
            'field_name', pf.field_name,
            'field_type', pf.field_type,
            'category', pf.category,
            'rating_value', up.rating_value
          ) ORDER BY pf.id
        ) as ratings
      FROM user_profiles up
      JOIN profile_fields pf ON up.field_id = pf.id
      WHERE up.user_id = $1
      GROUP BY DATE(up.recorded_at)
      ORDER BY MAX(up.recorded_at) ASC
    `;
    const result = await db.query(query, [userId]);
    
    // Transform to match frontend expectations (session_number, session_date)
    return result.rows.map((row, index) => ({
      session_id: index + 1,
      session_number: index + 1,
      session_date: row.recorded_at,
      profile_date: row.profile_date,
      recorded_at: row.recorded_at,
      ratings: row.ratings
    }));
  }
}

module.exports = Profile;

