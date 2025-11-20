const db = require('../config/database');

class Partner {
  // Generate a unique Partner ID based on organization name
  static async generatePartnerId(organizationId) {
    // Fetch organization name
    const orgQuery = 'SELECT name FROM organizations WHERE id = $1';
    const orgResult = await db.query(orgQuery, [organizationId]);
    
    if (!orgResult.rows[0]) {
      throw new Error('Organization not found');
    }
    
    const orgName = orgResult.rows[0].name;
    
    // Extract first two letters from organization name (uppercase)
    const prefix = orgName
      .replace(/[^a-zA-Z]/g, '') // Remove non-alphabetic characters
      .substring(0, 2)
      .toUpperCase()
      .padEnd(2, 'X'); // Pad with 'X' if less than 2 letters
    
    // Generate unique Partner ID with collision handling
    let partnerId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!isUnique && attempts < maxAttempts) {
      // Generate 5 random digits
      const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
      partnerId = `${prefix}${randomDigits}`;
      
      // Check if this Partner ID already exists
      const checkQuery = 'SELECT id FROM partners WHERE partner_id = $1';
      const checkResult = await db.query(checkQuery, [partnerId]);
      
      if (checkResult.rows.length === 0) {
        isUnique = true;
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique Partner ID after multiple attempts');
    }
    
    return partnerId;
  }

  static async create(partnerData, client = null) {
    const { name, sex, age, email, contact, address, photo_url, organization_id } = partnerData;
    
    // Generate unique Partner ID
    const partnerId = await this.generatePartnerId(organization_id);
    
    const query = `
      INSERT INTO partners (partner_id, name, sex, age, email, contact, address, photo_url, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [partnerId, name, sex, age, email, contact, address, photo_url, organization_id];
    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM partners WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM partners WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByPartnerId(partnerId) {
    const query = 'SELECT * FROM partners WHERE partner_id = $1';
    const result = await db.query(query, [partnerId]);
    return result.rows[0];
  }

  static async findByOrganization(organizationId) {
    const query = 'SELECT * FROM partners WHERE organization_id = $1';
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  static async update(id, partnerData) {
    const { name, sex, age, email, contact, address, photo_url } = partnerData;
    const query = `
      UPDATE partners 
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
    const query = 'DELETE FROM partners WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getUsers(partnerId) {
    const query = `
      SELECT u.* FROM users u
      JOIN user_partner_assignments upa ON u.id = upa.user_id
      WHERE upa.partner_id = $1
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }
}

module.exports = Partner;

