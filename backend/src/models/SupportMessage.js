const db = require('../config/database');

class SupportMessage {
  /**
   * Create a new support message
   * @param {Object} messageData - Message data
   * @param {number} messageData.conversation_id - Conversation ID
   * @param {string} messageData.sender_type - 'partner', 'organization', 'admin', or 'user'
   * @param {number} messageData.sender_id - Sender ID
   * @param {string} messageData.message - Message text
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created message
   */
  static async create(messageData, client = null) {
    const { conversation_id, sender_type, sender_id, message } = messageData;
    const dbClient = client || db;

    const query = `
      INSERT INTO support_messages (conversation_id, sender_type, sender_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [conversation_id, sender_type, sender_id, message];
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Find message by ID
   * @param {number} id - Message ID
   * @returns {Promise<Object|null>} Message or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM support_messages WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all messages for a conversation with sender details
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Array>} Array of messages with sender information
   */
  static async findByConversationId(conversationId) {
    const query = `
      SELECT 
        sm.*,
        CASE 
          WHEN sm.sender_type = 'admin' THEN a.name
          WHEN sm.sender_type = 'partner' THEN p.name
          WHEN sm.sender_type = 'organization' THEN o.name
          WHEN sm.sender_type = 'user' THEN u.name
        END as sender_name,
        CASE 
          WHEN sm.sender_type = 'admin' THEN a.email
          WHEN sm.sender_type = 'partner' THEN p.email
          WHEN sm.sender_type = 'organization' THEN o.email
          WHEN sm.sender_type = 'user' THEN u.email
        END as sender_email,
        CASE 
          WHEN sm.sender_type = 'admin' THEN NULL
          WHEN sm.sender_type = 'partner' THEN p.photo_url
          WHEN sm.sender_type = 'organization' THEN o.photo_url
          WHEN sm.sender_type = 'user' THEN u.photo_url
        END as sender_photo_url
      FROM support_messages sm
      LEFT JOIN admins a ON sm.sender_type = 'admin' AND sm.sender_id = a.id
      LEFT JOIN partners p ON sm.sender_type = 'partner' AND sm.sender_id = p.id
      LEFT JOIN organizations o ON sm.sender_type = 'organization' AND sm.sender_id = o.id
      LEFT JOIN users u ON sm.sender_type = 'user' AND sm.sender_id = u.id
      WHERE sm.conversation_id = $1
      ORDER BY sm.created_at ASC
    `;
    const result = await db.query(query, [conversationId]);
    return result.rows;
  }

  /**
   * Mark messages as read for a conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} readerType - Type of reader ('partner', 'organization', 'admin', 'user')
   * @param {number} readerId - Reader ID
   * @returns {Promise<number>} Number of messages marked as read
   */
  static async markAsRead(conversationId, readerType, readerId) {
    // Only mark messages that were not sent by the reader
    const query = `
      UPDATE support_messages
      SET read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1
        AND (sender_type != $2 OR sender_id != $3)
        AND read_at IS NULL
      RETURNING id
    `;
    const result = await db.query(query, [conversationId, readerType, readerId]);
    return result.rows.length;
  }

  /**
   * Get unread message count for a conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} readerType - Type of reader
   * @param {number} readerId - Reader ID
   * @returns {Promise<number>} Count of unread messages
   */
  static async getUnreadCount(conversationId, readerType, readerId) {
    const query = `
      SELECT COUNT(*) as count
      FROM support_messages
      WHERE conversation_id = $1
        AND (sender_type != $2 OR sender_id != $3)
        AND read_at IS NULL
    `;
    const result = await db.query(query, [conversationId, readerType, readerId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete a message
   * @param {number} id - Message ID
   * @returns {Promise<Object|null>} Deleted message
   */
  static async delete(id) {
    const query = 'DELETE FROM support_messages WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = SupportMessage;

