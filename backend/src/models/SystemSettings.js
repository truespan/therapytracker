const db = require('../config/database');

class SystemSettings {
  /**
   * Get a setting value by key
   */
  static async get(key) {
    const query = 'SELECT setting_value FROM system_settings WHERE setting_key = $1';
    const result = await db.query(query, [key]);
    return result.rows[0]?.setting_value || null;
  }

  /**
   * Set a setting value
   */
  static async set(key, value, adminId = null) {
    const query = `
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
      WHERE setting_key = $3
      RETURNING *
    `;
    const result = await db.query(query, [value, adminId, key]);
    return result.rows[0];
  }

  /**
   * Get default subscription plan ID
   */
  static async getDefaultSubscriptionPlanId() {
    const value = await this.get('default_subscription_plan_id');
    return value ? parseInt(value) : null;
  }

  /**
   * Set default subscription plan ID
   */
  static async setDefaultSubscriptionPlanId(planId, adminId = null) {
    return await this.set('default_subscription_plan_id', planId ? planId.toString() : null, adminId);
  }
}

module.exports = SystemSettings;

