const db = require('../config/database');

class Blog {
  static async create(blogData, client = null) {
    const { title, excerpt, content, category, author_id, author_type, featured_image_url, published, event_date, event_time, fee, event_type, address, max_participants } = blogData;
    
    // Check if new event fields exist in the database schema
    // If they don't exist, we'll only insert the fields that exist
    const hasEventFields = event_date !== undefined;
    const eventFieldsList = hasEventFields 
      ? ', event_date, event_time, fee, event_type, address, max_participants'
      : '';
    const eventValuesPlaceholder = hasEventFields 
      ? ', $9, $10, $11, $12, $13, $14'
      : '';
    
    const query = `
      INSERT INTO blogs (title, excerpt, content, category, author_id, author_type, featured_image_url, published, published_at${eventFieldsList})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = true THEN CURRENT_TIMESTAMP ELSE NULL END${eventValuesPlaceholder})
      RETURNING *
    `;
    
    let values;
    if (event_date !== undefined) {
      values = [
        title,
        excerpt || null,
        content,
        category || null,
        author_id,
        author_type || 'partner',
        featured_image_url || null,
        published || false,
        event_date || null,
        event_time || null,
        fee || null,
        event_type || 'Online',
        address || null,
        max_participants || null
      ];
    } else {
      values = [
        title,
        excerpt || null,
        content,
        category || null,
        author_id,
        author_type || 'partner',
        featured_image_url || null,
        published || false
      ];
    }

    const dbClient = client || db;
    
    try {
      const result = await dbClient.query(query, values);
      return result.rows[0];
    } catch (error) {
      // If columns don't exist, try without them
      if (error.code === '42703' && event_date !== undefined) {
        const fallbackQuery = `
          INSERT INTO blogs (title, excerpt, content, category, author_id, author_type, featured_image_url, published, published_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = true THEN CURRENT_TIMESTAMP ELSE NULL END)
          RETURNING *
        `;
        const fallbackValues = [
          title,
          excerpt || null,
          content,
          category || null,
          author_id,
          author_type || 'partner',
          featured_image_url || null,
          published || false
        ];
        const fallbackResult = await dbClient.query(fallbackQuery, fallbackValues);
        return fallbackResult.rows[0];
      }
      throw error;
    }
  }

  static async findAll(published = true) {
    const query = published
      ? `SELECT b.*, p.name as author_name 
         FROM blogs b
         JOIN partners p ON b.author_id = p.id
         WHERE b.published = true
         ORDER BY b.published_at DESC, b.created_at DESC`
      : `SELECT b.*, p.name as author_name 
         FROM blogs b
         JOIN partners p ON b.author_id = p.id
         ORDER BY b.created_at DESC`;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT b.*, p.name as author_name, p.email as author_email
      FROM blogs b
      JOIN partners p ON b.author_id = p.id
      WHERE b.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByAuthor(authorId) {
    const query = `
      SELECT b.*, p.name as author_name
      FROM blogs b
      JOIN partners p ON b.author_id = p.id
      WHERE b.author_id = $1 
      ORDER BY b.created_at DESC
    `;
    const result = await db.query(query, [authorId]);
    return result.rows;
  }

  static async findByOrganization(organizationId) {
    const query = `
      SELECT b.*, p.name as author_name
      FROM blogs b
      JOIN partners p ON b.author_id = p.id
      WHERE p.organization_id = $1 
      ORDER BY b.created_at DESC
    `;
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  static async update(id, blogData, authorId, organizationId = null) {
    const { title, excerpt, content, category, featured_image_url, published, event_date, event_time, fee, event_type, address, max_participants } = blogData;
    
    // If organizationId is provided and blog author is in same organization, allow update
    // Otherwise, only allow update if authorId matches
    const hasEventFields = event_date !== undefined;
    let whereClause;
    let setClause;
    let values;
    
    if (hasEventFields) {
      setClause = `
        title = $1, 
        excerpt = $2, 
        content = $3, 
        category = $4, 
        featured_image_url = $5, 
        published = $6,
        event_date = $7,
        event_time = $8,
        fee = $9,
        event_type = $10,
        address = $11,
        max_participants = $12,
        published_at = CASE 
          WHEN $6 = true AND published_at IS NULL THEN CURRENT_TIMESTAMP 
          WHEN $6 = false THEN NULL
          ELSE published_at 
        END,
        updated_at = CURRENT_TIMESTAMP
      `;
      
      if (organizationId) {
        whereClause = 'id = $13 AND (author_id = $14 OR author_id IN (SELECT id FROM partners WHERE organization_id = $15))';
        values = [
          title,
          excerpt || null,
          content,
          category || null,
          featured_image_url || null,
          published || false,
          event_date || null,
          event_time || null,
          fee || null,
          event_type || 'Online',
          address || null,
          max_participants || null,
          id,
          authorId,
          organizationId
        ];
      } else {
        whereClause = 'id = $13 AND author_id = $14';
        values = [
          title,
          excerpt || null,
          content,
          category || null,
          featured_image_url || null,
          published || false,
          event_date || null,
          event_time || null,
          fee || null,
          event_type || 'Online',
          address || null,
          max_participants || null,
          id,
          authorId
        ];
      }
    } else {
      whereClause = organizationId 
        ? 'id = $7 AND (author_id = $8 OR author_id IN (SELECT id FROM partners WHERE organization_id = $9))'
        : 'id = $7 AND author_id = $8';
      
      setClause = `
        title = $1, 
        excerpt = $2, 
        content = $3, 
        category = $4, 
        featured_image_url = $5, 
        published = $6, 
        published_at = CASE 
          WHEN $6 = true AND published_at IS NULL THEN CURRENT_TIMESTAMP 
          WHEN $6 = false THEN NULL
          ELSE published_at 
        END,
        updated_at = CURRENT_TIMESTAMP
      `;
      
      if (organizationId) {
        values = [
          title,
          excerpt || null,
          content,
          category || null,
          featured_image_url || null,
          published || false,
          id,
          authorId,
          organizationId
        ];
      } else {
        values = [
          title,
          excerpt || null,
          content,
          category || null,
          featured_image_url || null,
          published || false,
          id,
          authorId
        ];
      }
    }
    
    const query = `
      UPDATE blogs 
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      // If columns don't exist, try without them
      if (error.code === '42703' && hasEventFields) {
        whereClause = organizationId 
          ? 'id = $7 AND (author_id = $8 OR author_id IN (SELECT id FROM partners WHERE organization_id = $9))'
          : 'id = $7 AND author_id = $8';
        
        const fallbackQuery = `
          UPDATE blogs 
          SET title = $1, 
              excerpt = $2, 
              content = $3, 
              category = $4, 
              featured_image_url = $5, 
              published = $6, 
              published_at = CASE 
                WHEN $6 = true AND published_at IS NULL THEN CURRENT_TIMESTAMP 
                WHEN $6 = false THEN NULL
                ELSE published_at 
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE ${whereClause}
          RETURNING *
        `;
        
        const fallbackValues = organizationId
          ? [
              title,
              excerpt || null,
              content,
              category || null,
              featured_image_url || null,
              published || false,
              id,
              authorId,
              organizationId
            ]
          : [
              title,
              excerpt || null,
              content,
              category || null,
              featured_image_url || null,
              published || false,
              id,
              authorId
            ];
        
        const fallbackResult = await db.query(fallbackQuery, fallbackValues);
        return fallbackResult.rows[0];
      }
      throw error;
    }
  }

  static async delete(id, authorId, organizationId = null) {
    // If organizationId is provided and blog author is in same organization, allow delete
    // Otherwise, only allow delete if authorId matches
    let whereClause = 'id = $1 AND author_id = $2';
    if (organizationId) {
      whereClause = `
        id = $1 AND (
          author_id = $2 OR 
          author_id IN (SELECT id FROM partners WHERE organization_id = $3)
        )
      `;
    }
    
    const query = `
      DELETE FROM blogs 
      WHERE ${whereClause}
      RETURNING *
    `;
    
    const values = organizationId ? [id, authorId, organizationId] : [id, authorId];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async countByAuthor(authorId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM blogs 
      WHERE author_id = $1
    `;
    const result = await db.query(query, [authorId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Blog;


