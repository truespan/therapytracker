const db = require('../config/database');

class SupportConversation {
  /**
   * Calculate priority based on requester's subscription plan
   * @param {string} requesterType - 'partner' or 'organization'
   * @param {number} requesterId - Partner or Organization ID
   * @returns {Promise<Object>} Object with priority and subscription_plan_id
   */
  static async calculatePriority(requesterType, requesterId) {
    let priority = 0;
    let subscriptionPlanId = null;
    let planOrder = 0;

    if (requesterType === 'partner') {
      // Get partner's subscription plans and find the highest plan_order
      const query = `
        SELECT sp.id, sp.plan_order
        FROM partner_subscriptions ps
        JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
        WHERE ps.partner_id = $1
        ORDER BY sp.plan_order DESC
        LIMIT 1
      `;
      const result = await db.query(query, [requesterId]);
      if (result.rows.length > 0) {
        subscriptionPlanId = result.rows[0].id;
        planOrder = result.rows[0].plan_order || 0;
        priority = planOrder;
      }
    } else if (requesterType === 'organization') {
      // Get organization's subscription plan
      const query = `
        SELECT o.subscription_plan_id, COALESCE(sp.plan_order, 0) as plan_order
        FROM organizations o
        LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
        WHERE o.id = $1
      `;
      const result = await db.query(query, [requesterId]);
      if (result.rows.length > 0 && result.rows[0].subscription_plan_id) {
        subscriptionPlanId = result.rows[0].subscription_plan_id;
        planOrder = result.rows[0].plan_order || 0;
        priority = planOrder;
      }
    }

    return { priority, subscriptionPlanId, planOrder };
  }

  /**
   * Create a new support conversation
   * @param {Object} conversationData - Conversation data
   * @param {string} conversationData.requester_type - 'partner' or 'organization'
   * @param {number} conversationData.requester_id - Partner or Organization ID
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Created conversation
   */
  static async create(conversationData, client = null) {
    const { requester_type, requester_id, status = 'open' } = conversationData;
    const dbClient = client || db;

    // Calculate priority based on subscription plan
    const { priority, subscriptionPlanId } = await this.calculatePriority(requester_type, requester_id);

    const query = `
      INSERT INTO support_conversations (requester_type, requester_id, status, priority, subscription_plan_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const values = [requester_type, requester_id, status, priority, subscriptionPlanId];
    const result = await dbClient.query(query, values);
    const newId = result.rows[0].id;
    
    // Get the full conversation with plan_name
    const getQuery = `
      SELECT sc.*, sp.plan_name
      FROM support_conversations sc
      LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
      WHERE sc.id = $1
    `;
    const getResult = await dbClient.query(getQuery, [newId]);
    return getResult.rows[0];
  }

  /**
   * Find conversation by ID
   * @param {number} id - Conversation ID
   * @returns {Promise<Object|null>} Conversation or null
   */
  static async findById(id) {
    const query = `
      SELECT sc.*, sp.plan_name
      FROM support_conversations sc
      LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
      WHERE sc.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find open conversation for a requester (get or create pattern)
   * @param {string} requesterType - 'partner' or 'organization'
   * @param {number} requesterId - Partner or Organization ID
   * @param {Object} client - Optional database client for transactions
   * @returns {Promise<Object>} Existing or newly created conversation
   */
  static async getOrCreateOpenConversation(requesterType, requesterId, client = null) {
    const dbClient = client || db;

    // Try to find an open conversation
    const findQuery = `
      SELECT sc.*, sp.plan_name
      FROM support_conversations sc
      LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
      WHERE sc.requester_type = $1 
        AND sc.requester_id = $2 
        AND sc.status = 'open'
      ORDER BY sc.created_at DESC
      LIMIT 1
    `;
    const findResult = await dbClient.query(findQuery, [requesterType, requesterId]);

    if (findResult.rows.length > 0) {
      // Update priority in case subscription changed
      const { priority, subscriptionPlanId } = await this.calculatePriority(requesterType, requesterId);
      const updateQuery = `
        UPDATE support_conversations
        SET priority = $1, subscription_plan_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;
      await dbClient.query(updateQuery, [priority, subscriptionPlanId, findResult.rows[0].id]);
      
      // Get updated conversation with plan_name using the same client
      const getQuery = `
        SELECT sc.*, sp.plan_name
        FROM support_conversations sc
        LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
        WHERE sc.id = $1
      `;
      const getResult = await dbClient.query(getQuery, [findResult.rows[0].id]);
      return getResult.rows[0];
    }

    // Create new conversation
    return await this.create({ requester_type: requesterType, requester_id: requesterId, status: 'open' }, dbClient);
  }

  /**
   * Find all conversations for a requester
   * @param {string} requesterType - 'partner' or 'organization'
   * @param {number} requesterId - Partner or Organization ID
   * @returns {Promise<Array>} Array of conversations
   */
  static async findByRequester(requesterType, requesterId) {
    const query = `
      SELECT sc.*, sp.plan_name
      FROM support_conversations sc
      LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
      WHERE sc.requester_type = $1 AND sc.requester_id = $2
      ORDER BY sc.last_message_at DESC, sc.created_at DESC
    `;
    const result = await db.query(query, [requesterType, requesterId]);
    return result.rows;
  }

  /**
   * Get all conversations for support team (sorted by priority)
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status ('open', 'closed', or null for all)
   * @returns {Promise<Array>} Array of conversations sorted by priority
   */
  static async getAllForSupportTeam(filters = {}) {
    let query = `
      SELECT sc.*, sp.plan_name
      FROM support_conversations sc
      LEFT JOIN subscription_plans sp ON sc.subscription_plan_id = sp.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND sc.status = $${paramIndex++}`;
      values.push(filters.status);
    }

    // Sort by priority (desc), then by status (open first), then by last_message_at (desc)
    query += ` ORDER BY sc.priority DESC, 
              CASE WHEN sc.status = 'open' THEN 0 ELSE 1 END, 
              sc.last_message_at DESC NULLS LAST, 
              sc.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Update conversation
   * @param {number} id - Conversation ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object|null>} Updated conversation
   */
  static async update(id, updates) {
    const { status } = updates;
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE support_conversations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rows[0]) {
      return await this.findById(id); // Get with plan_name
    }
    return null;
  }

  /**
   * Close a conversation
   * @param {number} id - Conversation ID
   * @returns {Promise<Object|null>} Updated conversation
   */
  static async close(id) {
    return await this.update(id, { status: 'closed' });
  }

  /**
   * Reopen a conversation
   * @param {number} id - Conversation ID
   * @returns {Promise<Object|null>} Updated conversation
   */
  static async reopen(id) {
    return await this.update(id, { status: 'open' });
  }

  /**
   * Update priority for a conversation (call when subscription changes)
   * @param {number} id - Conversation ID
   * @returns {Promise<Object|null>} Updated conversation
   */
  static async updatePriority(id) {
    const conversation = await this.findById(id);
    if (!conversation) {
      return null;
    }

    const { priority, subscriptionPlanId } = await this.calculatePriority(
      conversation.requester_type,
      conversation.requester_id
    );

    const query = `
      UPDATE support_conversations
      SET priority = $1, subscription_plan_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [priority, subscriptionPlanId, id]);
    if (result.rows[0]) {
      return await this.findById(id); // Get with plan_name
    }
    return null;
  }

  /**
   * Delete a conversation (cascade will delete messages)
   * @param {number} id - Conversation ID
   * @returns {Promise<Object|null>} Deleted conversation
   */
  static async delete(id) {
    const query = 'DELETE FROM support_conversations WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = SupportConversation;

