const db = require('../config/database');

class User {
  static async create(userData, client = null) {
    const { name, sex, age, email, contact, address, photo_url } = userData;
    const query = `
      INSERT INTO users (name, sex, age, email, contact, address, photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [name, sex, age, email, contact, address, photo_url];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByContact(contact) {
    const query = 'SELECT * FROM users WHERE contact = $1';
    const result = await db.query(query, [contact]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { name, sex, age, email, contact, address, photo_url } = userData;
    const query = `
      UPDATE users 
      SET name = COALESCE($1, name),
          sex = COALESCE($2, sex),
          age = COALESCE($3, age),
          email = COALESCE($4, email),
          contact = COALESCE($5, contact),
          address = COALESCE($6, address),
          photo_url = COALESCE($7, photo_url)
      WHERE id = $8
      RETURNING *
    `;
    const values = [name, sex, age, email, contact, address, photo_url, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getPartners(userId) {
    const query = `
      SELECT p.* FROM partners p
      JOIN user_partner_assignments upa ON p.id = upa.partner_id
      WHERE upa.user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async assignToPartner(userId, partnerId, client = null) {
    const query = `
      INSERT INTO user_partner_assignments (user_id, partner_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, partner_id) DO NOTHING
      RETURNING *
    `;
    const dbClient = client || db;
    const result = await dbClient.query(query, [userId, partnerId]);
    return result.rows[0];
  }

  static async removeFromPartner(userId, partnerId) {
    const query = `
      DELETE FROM user_partner_assignments 
      WHERE user_id = $1 AND partner_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [userId, partnerId]);
    return result.rows[0];
  }
}

module.exports = User;

