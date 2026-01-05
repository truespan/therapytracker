const db = require('../config/database');

/**
 * PlanOfAssessment Model
 * Manages plan of assessment data for user/partner pairs
 */

class PlanOfAssessment {
  /**
   * Find plan of assessment by user ID and partner ID
   * @param {number} userId - User ID
   * @param {number} partnerId - Partner ID
   * @returns {Promise<Object|null>} Plan of assessment record
   */
  static async findByUserIdAndPartnerId(userId, partnerId) {
    try {
      const result = await db.query(
        `SELECT * FROM plan_of_assessments 
         WHERE user_id = $1 AND partner_id = $2`,
        [userId, partnerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error finding plan of assessment:', error.message);
      throw new Error(`Failed to find plan of assessment: ${error.message}`);
    }
  }

  /**
   * Build payload for plan of assessment
   * @param {Object} planOfAssessmentData - Plan of assessment data
   * @param {number} userId - User ID
   * @param {number} partnerId - Partner ID
   * @returns {Object} Payload object
   */
  static buildPayload(planOfAssessmentData, userId, partnerId) {
    return {
      user_id: userId,
      partner_id: partnerId,
      plan_of_assessment: planOfAssessmentData.plan_of_assessment || null,
      updated_at: new Date()
    };
  }

  /**
   * Save or update plan of assessment
   * @param {Object} payload - Plan of assessment payload
   * @returns {Promise<Object>} Saved plan of assessment record
   */
  static async saveOrUpdate(payload) {
    try {
      const existing = await this.findByUserIdAndPartnerId(
        payload.user_id,
        payload.partner_id
      );

      if (existing) {
        return await this.update(existing.id, payload);
      } else {
        return await this.create(payload);
      }
    } catch (error) {
      console.error('Error saving plan of assessment:', error.message);
      throw new Error(`Failed to save plan of assessment: ${error.message}`);
    }
  }

  /**
   * Create new plan of assessment record
   * @param {Object} payload - Plan of assessment payload
   * @returns {Promise<Object>} Created plan of assessment record
   */
  static async create(payload) {
    try {
      const result = await db.query(
        `INSERT INTO plan_of_assessments 
         (user_id, partner_id, plan_of_assessment, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [
          payload.user_id,
          payload.partner_id,
          JSON.stringify(payload.plan_of_assessment)
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating plan of assessment:', error.message);
      throw new Error(`Failed to create plan of assessment: ${error.message}`);
    }
  }

  /**
   * Update existing plan of assessment record
   * @param {number} id - Plan of assessment ID
   * @param {Object} payload - Plan of assessment payload
   * @returns {Promise<Object>} Updated plan of assessment record
   */
  static async update(id, payload) {
    try {
      const result = await db.query(
        `UPDATE plan_of_assessments 
         SET plan_of_assessment = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(payload.plan_of_assessment), id]
      );

      if (result.rows.length === 0) {
        throw new Error('Plan of assessment not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating plan of assessment:', error.message);
      throw new Error(`Failed to update plan of assessment: ${error.message}`);
    }
  }
}

module.exports = PlanOfAssessment;

