const db = require('../config/database');

class Event {
  static async create(eventData, client = null) {
    const { title, description, event_date, location, fee_amount, partner_id, image_url, address, max_participants } = eventData;
    
    const query = `
      INSERT INTO events (title, description, event_date, location, fee_amount, partner_id, image_url, address, max_participants)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      title,
      description || null,
      event_date,
      location || null,
      fee_amount || 0.00,
      partner_id,
      image_url || null,
      address || null,
      max_participants || null
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT e.*, p.name as partner_name
      FROM events e
      JOIN partners p ON e.partner_id = p.id
      ORDER BY e.event_date ASC, e.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT e.*, p.name as partner_name, p.email as partner_email
      FROM events e
      JOIN partners p ON e.partner_id = p.id
      WHERE e.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByPartner(partnerId) {
    const query = `
      SELECT e.*, p.name as partner_name
      FROM events e
      JOIN partners p ON e.partner_id = p.id
      WHERE e.partner_id = $1
      ORDER BY e.event_date ASC, e.created_at DESC
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  static async findByUserTherapist(userId, partnerId = null) {
    // Get events from therapists assigned to this user
    let query = `
      SELECT DISTINCT e.*, p.name as partner_name
      FROM events e
      JOIN partners p ON e.partner_id = p.id
      JOIN user_partner_assignments upa ON p.id = upa.partner_id
      WHERE upa.user_id = $1
    `;
    const values = [userId];
    
    if (partnerId) {
      query += ` AND e.partner_id = $2`;
      values.push(partnerId);
    }
    
    query += ` ORDER BY e.event_date ASC, e.created_at DESC`;
    
    const result = await db.query(query, values);
    return result.rows;
  }

  static async update(id, eventData, partnerId) {
    const { title, description, event_date, location, fee_amount, image_url, address, max_participants } = eventData;
    
    const query = `
      UPDATE events 
      SET title = $1,
          description = $2,
          event_date = $3,
          location = $4,
          fee_amount = $5,
          image_url = $6,
          address = $7,
          max_participants = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND partner_id = $10
      RETURNING *
    `;
    
    const values = [
      title,
      description || null,
      event_date,
      location || null,
      fee_amount || 0.00,
      image_url || null,
      address || null,
      max_participants || null,
      id,
      partnerId
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id, partnerId) {
    const query = `
      DELETE FROM events 
      WHERE id = $1 AND partner_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [id, partnerId]);
    return result.rows[0];
  }

  static async countByPartner(partnerId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM events 
      WHERE partner_id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Event;
