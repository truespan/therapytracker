const db = require('../config/database');

class Blog {
  static async create(blogData, client = null) {
    const { title, excerpt, content, category, author_id, author_type, featured_image_url, published } = blogData;
    const query = `
      INSERT INTO blogs (title, excerpt, content, category, author_id, author_type, featured_image_url, published, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = true THEN CURRENT_TIMESTAMP ELSE NULL END)
      RETURNING *
    `;
    const values = [
      title,
      excerpt || null,
      content,
      category || null,
      author_id,
      author_type || 'partner',
      featured_image_url || null,
      published || false
    ];

    const dbClient = client || db;
    const result = await dbClient.query(query, values);
    return result.rows[0];
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

  static async update(id, blogData, authorId) {
    const { title, excerpt, content, category, featured_image_url, published } = blogData;
    const query = `
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
      WHERE id = $7 AND author_id = $8
      RETURNING *
    `;
    const values = [
      title,
      excerpt || null,
      content,
      category || null,
      featured_image_url || null,
      published || false,
      id,
      authorId
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id, authorId) {
    const query = `
      DELETE FROM blogs 
      WHERE id = $1 AND author_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [id, authorId]);
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

