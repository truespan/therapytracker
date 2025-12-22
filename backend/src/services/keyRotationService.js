const db = require('../config/database');
const enhancedEncryptionService = require('../services/enhancedEncryptionService');
const auditService = require('../services/auditService');
const { KEY_TYPES, DATA_TYPE_MAPPINGS } = require('../utils/encryptionConstants');

/**
 * Key Rotation Service for HIPAA & GDPR Compliance
 * Manages automated and manual rotation of encryption keys
 * Implements key rotation policies and procedures
 */

class KeyRotationService {
  constructor() {
    // Rotation schedules in days
    this.rotationSchedule = {
      [KEY_TYPES.DATA]: 90,      // 90 days for data encryption keys
      [KEY_TYPES.ORGANIZATION]: 365  // 365 days for organization keys
    };
    
    // Notification periods in days
    this.notificationPeriods = {
      upcoming: 30,    // Notify 30 days before rotation
      overdue: 7       // Alert if rotation overdue by 7 days
    };
  }

  /**
   * Check if a key needs rotation based on age and policy
   * @param {string} keyId - Key identifier
   * @returns {Promise<Object>} Rotation status
   */
  async checkRotationStatus(keyId) {
    try {
      const query = `
        SELECT 
          k.*,
          o.name as organization_name,
          CURRENT_TIMESTAMP - k.created_at as age,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - k.created_at)) as age_days
        FROM encryption_keys k
        LEFT JOIN organizations o ON k.organization_id = o.id
        WHERE k.key_id = $1
      `;
      
      const result = await db.query(query, [keyId]);
      const keyInfo = result.rows[0];
      
      if (!keyInfo) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      const rotationPeriod = this.rotationSchedule[keyInfo.key_type];
      const ageDays = parseInt(keyInfo.age_days);
      
      const status = {
        keyId: keyInfo.key_id,
        keyType: keyInfo.key_type,
        organizationId: keyInfo.organization_id,
        organizationName: keyInfo.organization_name,
        ageDays: ageDays,
        rotationPeriod: rotationPeriod,
        needsRotation: ageDays >= rotationPeriod,
        daysUntilRotation: Math.max(0, rotationPeriod - ageDays),
        isOverdue: ageDays > rotationPeriod + this.notificationPeriods.overdue
      };
      
      return status;
    } catch (error) {
      console.error('Error checking rotation status:', error.message);
      throw new Error(`Failed to check rotation status: ${error.message}`);
    }
  }

  /**
   * Get all keys that need rotation for an organization
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Array>} Keys needing rotation
   */
  async getKeysNeedingRotation(organizationId) {
    try {
      const query = `
        SELECT 
          k.*,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - k.created_at)) as age_days
        FROM encryption_keys k
        WHERE k.organization_id = $1 
          AND k.status = 'active'
          AND k.key_type != 'master'
        ORDER BY k.key_type, k.data_type, k.created_at
      `;
      
      const result = await db.query(query, [organizationId]);
      const keysNeedingRotation = [];
      
      for (const key of result.rows) {
        const rotationPeriod = this.rotationSchedule[key.key_type];
        const ageDays = parseInt(key.age_days);
        
        if (ageDays >= rotationPeriod) {
          keysNeedingRotation.push({
            keyId: key.key_id,
            keyType: key.key_type,
            dataType: key.data_type,
            ageDays: ageDays,
            rotationPeriod: rotationPeriod,
            daysOverdue: ageDays - rotationPeriod
          });
        }
      }
      
      return keysNeedingRotation;
    } catch (error) {
      console.error('Error getting keys needing rotation:', error.message);
      throw new Error(`Failed to get keys needing rotation: ${error.message}`);
    }
  }

  /**
   * Rotate a data encryption key
   * @param {string} oldKeyId - Old key identifier
   * @param {Object} user - User performing the rotation
   * @returns {Promise<Object>} Rotation result
   */
  async rotateDataKey(oldKeyId, user) {
    try {
      // Get old key information
      const oldKeyInfo = await enhancedEncryptionService.getKeyInfo(oldKeyId);
      
      if (!oldKeyInfo) {
        throw new Error(`Key not found: ${oldKeyId}`);
      }
      
      if (oldKeyInfo.key_type !== KEY_TYPES.DATA) {
        throw new Error(`Key ${oldKeyId} is not a data encryption key`);
      }
      
      // Generate new key
      const newKeyData = await enhancedEncryptionService.generateDataKey(
        oldKeyInfo.organization_id,
        oldKeyInfo.data_type
      );
      
      // Get all records using the old key
      const tableName = this.getTableNameForDataType(oldKeyInfo.data_type);
      
      const recordsQuery = `
        SELECT id, encrypted_data, encryption_version
        FROM ${tableName}
        WHERE encryption_key_id = $1 AND encrypted_data IS NOT NULL
      `;
      
      const recordsResult = await db.query(recordsQuery, [oldKeyId]);
      const records = recordsResult.rows;
      
      console.log(`Rotating ${records.length} records from key ${oldKeyId} to ${newKeyData.keyId}`);
      
      // Re-encrypt each record
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const record of records) {
        try {
          // Decrypt with old key
          const decryptedData = await this.reencryptRecord(
            tableName,
            record.id,
            oldKeyId,
            newKeyData.keyId
          );
          
          successCount++;
          
          // Log progress every 100 records
          if (successCount % 100 === 0) {
            console.log(`  Progress: ${successCount}/${records.length} records re-encrypted`);
          }
        } catch (error) {
          errorCount++;
          errors.push({
            recordId: record.id,
            error: error.message
          });
        }
      }
      
      // Mark old key as deprecated
      await this.deprecateKey(oldKeyId, user);
      
      // Log key rotation
      await auditService.logKeyManagement(
        'rotate',
        newKeyData.keyId,
        KEY_TYPES.DATA,
        user,
        {
          organizationId: oldKeyInfo.organization_id,
          dataType: oldKeyInfo.data_type,
          oldKeyId: oldKeyId,
          recordsProcessed: records.length,
          successCount: successCount,
          errorCount: errorCount,
          version: newKeyData.dbRecord.version,
          success: errorCount === 0
        }
      );
      
      return {
        success: errorCount === 0,
        oldKeyId: oldKeyId,
        newKeyId: newKeyData.keyId,
        recordsProcessed: records.length,
        successCount: successCount,
        errorCount: errorCount,
        errors: errors.slice(0, 10) // Limit error details
      };
    } catch (error) {
      console.error('Error rotating data key:', error.message);
      
      await auditService.logKeyManagement(
        'rotate',
        oldKeyId,
        KEY_TYPES.DATA,
        user,
        {
          error: error,
          success: false
        }
      );
      
      throw new Error(`Failed to rotate data key: ${error.message}`);
    }
  }

  /**
   * Rotate an organization key
   * @param {string} oldKeyId - Old organization key identifier
   * @param {Object} user - User performing the rotation
   * @returns {Promise<Object>} Rotation result
   */
  async rotateOrganizationKey(oldKeyId, user) {
    try {
      // Get old key information
      const oldKeyInfo = await enhancedEncryptionService.getKeyInfo(oldKeyId);
      
      if (!oldKeyInfo) {
        throw new Error(`Key not found: ${oldKeyId}`);
      }
      
      if (oldKeyInfo.key_type !== KEY_TYPES.ORGANIZATION) {
        throw new Error(`Key ${oldKeyId} is not an organization key`);
      }
      
      // Generate new organization key
      const newKeyData = await enhancedEncryptionService.generateOrganizationKey(
        oldKeyInfo.organization_id
      );
      
      // Get all data encryption keys for this organization
      const dataKeysQuery = `
        SELECT key_id, data_type
        FROM encryption_keys
        WHERE organization_id = $1 
          AND key_type = 'data'
          AND status = 'active'
      `;
      
      const dataKeysResult = await db.query(dataKeysQuery, [oldKeyInfo.organization_id]);
      const dataKeys = dataKeysResult.rows;
      
      console.log(`Rotating ${dataKeys.length} data keys for organization ${oldKeyInfo.organization_id}`);
      
      // Re-encrypt each data key with the new organization key
      let successCount = 0;
      let errorCount = 0;
      
      for (const dataKey of dataKeys) {
        try {
          await this.reencryptDataKey(dataKey.key_id, oldKeyId, newKeyData.keyId);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error re-encrypting data key ${dataKey.key_id}:`, error.message);
        }
      }
      
      // Mark old organization key as deprecated
      await this.deprecateKey(oldKeyId, user);
      
      // Log organization key rotation
      await auditService.logKeyManagement(
        'rotate',
        newKeyData.keyId,
        KEY_TYPES.ORGANIZATION,
        user,
        {
          organizationId: oldKeyInfo.organization_id,
          oldKeyId: oldKeyId,
          dataKeysProcessed: dataKeys.length,
          successCount: successCount,
          errorCount: errorCount,
          version: newKeyData.dbRecord.version,
          success: errorCount === 0
        }
      );
      
      return {
        success: errorCount === 0,
        oldKeyId: oldKeyId,
        newKeyId: newKeyData.keyId,
        dataKeysProcessed: dataKeys.length,
        successCount: successCount,
        errorCount: errorCount
      };
    } catch (error) {
      console.error('Error rotating organization key:', error.message);
      
      await auditService.logKeyManagement(
        'rotate',
        oldKeyId,
        KEY_TYPES.ORGANIZATION,
        user,
        {
          error: error,
          success: false
        }
      );
      
      throw new Error(`Failed to rotate organization key: ${error.message}`);
    }
  }

  /**
   * Re-encrypt a single record with new key
   * @private
   */
  async reencryptRecord(tableName, recordId, oldKeyId, newKeyId) {
    try {
      // Get current record
      const recordQuery = `
        SELECT encrypted_data, encryption_version
        FROM ${tableName}
        WHERE id = $1 AND encryption_key_id = $2
      `;
      
      const recordResult = await db.query(recordQuery, [recordId, oldKeyId]);
      const record = recordResult.rows[0];
      
      if (!record || !record.encrypted_data) {
        throw new Error(`Record ${recordId} not found or not encrypted`);
      }
      
      // Decrypt with old key
      const decryptedData = await enhancedEncryptionService.decryptData(
        record.encrypted_data,
        oldKeyId
      );
      
      // Re-encrypt with new key
      const encryptedData = await enhancedEncryptionService.encryptData(
        decryptedData,
        newKeyId
      );
      
      // Update record
      const updateQuery = `
        UPDATE ${tableName}
        SET encrypted_data = $1, encryption_key_id = $2, encryption_version = $3
        WHERE id = $4
      `;
      
      await db.query(updateQuery, [
        JSON.stringify(encryptedData.encryptedData),
        newKeyId,
        (record.encryption_version || 1) + 1,
        recordId
      ]);
      
    } catch (error) {
      console.error(`Error re-encrypting record ${recordId}:`, error.message);
      throw error;
    }
  }

  /**
   * Re-encrypt a data encryption key with new organization key
   * @private
   */
  async reencryptDataKey(dataKeyId, oldOrgKeyId, newOrgKeyId) {
    try {
      // Get the encrypted data key
      const keyQuery = `
        SELECT encrypted_key
        FROM encryption_keys
        WHERE key_id = $1 AND key_type = 'data'
      `;
      
      const keyResult = await db.query(keyQuery, [dataKeyId]);
      const encryptedKey = keyResult.rows[0]?.encrypted_key;
      
      if (!encryptedKey) {
        throw new Error(`Data key ${dataKeyId} not found`);
      }
      
      // Decrypt with old organization key
      const masterKey = enhancedEncryptionService.getMasterKey();
      const plainKey = enhancedEncryptionService.decryptWithKey(encryptedKey, masterKey);
      
      // Re-encrypt with new organization key
      const newEncryptedKey = enhancedEncryptionService.encryptWithKey(plainKey, masterKey);
      
      // Update database
      const updateQuery = `
        UPDATE encryption_keys
        SET encrypted_key = $1, updated_at = CURRENT_TIMESTAMP
        WHERE key_id = $2
      `;
      
      await db.query(updateQuery, [newEncryptedKey, dataKeyId]);
      
    } catch (error) {
      console.error(`Error re-encrypting data key ${dataKeyId}:`, error.message);
      throw error;
    }
  }

  /**
   * Deprecate an old key after rotation
   * @private
   */
  async deprecateKey(keyId, user) {
    try {
      const query = `
        UPDATE encryption_keys
        SET status = 'deprecated',
            retired_at = CURRENT_TIMESTAMP
        WHERE key_id = $1
        RETURNING id, key_id, status
      `;
      
      const result = await db.query(query, [keyId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Key not found: ${keyId}`);
      }
      
      // Log key deprecation
      await auditService.logKeyManagement(
        'retire',
        keyId,
        result.rows[0].key_type,
        user,
        { success: true }
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error deprecating key:', error.message);
      throw error;
    }
  }

  /**
   * Get table name for data type
   * @private
   */
  getTableNameForDataType(dataType) {
    const tableMap = {
      'case_history': 'case_histories',
      'mental_status': 'mental_status_examinations',
      'questionnaire': 'questionnaire_responses',
      'appointment': 'appointments'
    };
    
    return tableMap[dataType] || null;
  }

  /**
   * Schedule automatic key rotation
   * @param {number} organizationId - Organization ID (optional)
   */
  async scheduleKeyRotation(organizationId = null) {
    try {
      // This would integrate with a job scheduler like node-cron or bull
      // For now, we'll log what would be scheduled
      
      if (organizationId) {
        console.log(`Scheduling key rotation for organization ${organizationId}`);
        const keysNeedingRotation = await this.getKeysNeedingRotation(organizationId);
        
        for (const keyInfo of keysNeedingRotation) {
          console.log(`  - ${keyInfo.keyType} key ${keyInfo.keyId} (${keyInfo.daysOverdue} days overdue)`);
        }
      } else {
        console.log('Scheduling key rotation for all organizations');
        // Would query all organizations and schedule rotation checks
      }
      
      // In a real implementation, this would create scheduled jobs
      // For example, with node-cron:
      // cron.schedule('0 2 * * *', () => this.checkAndRotateKeys());
      
    } catch (error) {
      console.error('Error scheduling key rotation:', error.message);
      throw error;
    }
  }

  /**
   * Check and rotate keys automatically (for scheduled jobs)
   * @param {number} organizationId - Organization ID (optional)
   */
  async checkAndRotateKeys(organizationId = null) {
    try {
      const keysToRotate = await this.getKeysNeedingRotation(organizationId || 1);
      
      for (const keyInfo of keysToRotate) {
        try {
          console.log(`Auto-rotating key ${keyInfo.keyId}...`);
          
          if (keyInfo.keyType === KEY_TYPES.DATA) {
            await this.rotateDataKey(keyInfo.keyId, { id: 0, role: 'system' });
          } else if (keyInfo.keyType === KEY_TYPES.ORGANIZATION) {
            await this.rotateOrganizationKey(keyInfo.keyId, { id: 0, role: 'system' });
          }
          
          console.log(`  ✓ Key ${keyInfo.keyId} rotated successfully`);
        } catch (error) {
          console.error(`  ✗ Error rotating key ${keyInfo.keyId}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('Error in automatic key rotation:', error.message);
    }
  }

  /**
   * Get key rotation report for an organization
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Object>} Rotation report
   */
  async getRotationReport(organizationId) {
    try {
      const query = `
        SELECT 
          key_type,
          data_type,
          COUNT(*) as total_keys,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keys,
          COUNT(CASE WHEN status = 'deprecated' THEN 1 END) as deprecated_keys,
          AVG(EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - created_at))) as avg_age_days,
          MAX(EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - created_at))) as max_age_days
        FROM encryption_keys
        WHERE organization_id = $1
        GROUP BY key_type, data_type
        ORDER BY key_type, data_type
      `;
      
      const result = await db.query(query, [organizationId]);
      const keyStats = result.rows;
      
      // Check which keys need rotation
      const keysNeedingRotation = await this.getKeysNeedingRotation(organizationId);
      
      return {
        organizationId: organizationId,
        generatedAt: new Date(),
        keyStats: keyStats,
        keysNeedingRotation: keysNeedingRotation,
        totalKeysNeedingRotation: keysNeedingRotation.length,
        rotationSchedule: this.rotationSchedule
      };
    } catch (error) {
      console.error('Error generating rotation report:', error.message);
      throw new Error(`Failed to generate rotation report: ${error.message}`);
    }
  }
}

module.exports = new KeyRotationService();