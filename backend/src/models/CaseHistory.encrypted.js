const db = require('../config/database');
const enhancedEncryptionService = require('../services/enhancedEncryptionService');
const auditService = require('../services/auditService');
const { 
  CASE_HISTORY_SENSITIVE_FIELDS, 
  SEARCHABLE_ENCRYPTED_FIELDS,
  DATA_TYPE_MAPPINGS,
  AUDIT_OPERATIONS
} = require('../utils/encryptionConstants');

/**
 * Enhanced CaseHistory Model with HIPAA/GDPR Encryption Support
 * Implements field-level encryption for sensitive medical and psychological data
 */

class CaseHistory {
  
  /**
   * Get encryption key for case history data
   * @param {number} organizationId - Organization ID
   * @returns {Promise<string>} Encryption key ID
   */
  static async getEncryptionKey(organizationId) {
    try {
      // Check if organization already has a case history key
      const query = `
        SELECT key_id FROM encryption_keys 
        WHERE organization_id = $1 AND data_type = 'case_history' AND status = 'active'
        ORDER BY created_at DESC LIMIT 1
      `;
      
      const result = await db.query(query, [organizationId]);
      
      if (result.rows.length > 0) {
        return result.rows[0].key_id;
      }
      
      // Generate new key if none exists
      const keyData = await enhancedEncryptionService.generateDataKey(
        organizationId, 
        'case_history'
      );
      
      // Log key generation
      await auditService.logKeyManagement(
        'generate',
        keyData.keyId,
        'data',
        { organization_id: organizationId },
        { version: 1, success: true }
      );
      
      return keyData.keyId;
    } catch (error) {
      console.error('Error getting encryption key:', error.message);
      throw new Error(`Failed to get encryption key: ${error.message}`);
    }
  }

  /**
   * Create searchable blind index for encrypted fields
   * @param {Object} caseHistoryData - Case history data
   * @param {string} keyId - Encryption key ID
   * @returns {Promise<Object>} Blind indexes
   */
  static async createBlindIndexes(caseHistoryData, keyId) {
    try {
      const blindIndexes = {};
      const keyInfo = await enhancedEncryptionService.getKeyInfo(keyId);
      
      // Use organization ID as blind index key for consistency
      const blindIndexKey = `blind_index_${keyInfo.organization_id}`;
      
      for (const field of SEARCHABLE_ENCRYPTED_FIELDS.case_history) {
        if (caseHistoryData[field] && typeof caseHistoryData[field] === 'string') {
          blindIndexes[field] = enhancedEncryptionService.createBlindIndex(
            caseHistoryData[field],
            blindIndexKey
          );
        }
      }
      
      return blindIndexes;
    } catch (error) {
      console.error('Error creating blind indexes:', error.message);
      // Don't throw - blind indexes are optional for search functionality
      return {};
    }
  }

  /**
   * Encrypt sensitive fields in case history data
   * @param {Object} caseHistoryData - Case history data to encrypt
   * @param {string} keyId - Encryption key ID
   * @returns {Promise<Object>} Object with encrypted data and blind indexes
   */
  static async encryptData(caseHistoryData, keyId) {
    try {
      // Extract sensitive fields for encryption
      const sensitiveData = {};
      const nonSensitiveData = { ...caseHistoryData };
      
      for (const field of CASE_HISTORY_SENSITIVE_FIELDS) {
        if (caseHistoryData[field] !== undefined && caseHistoryData[field] !== null) {
          sensitiveData[field] = caseHistoryData[field];
          delete nonSensitiveData[field];
        }
      }
      
      // Encrypt sensitive fields
      const encryptedData = await enhancedEncryptionService.encryptObject(
        sensitiveData,
        CASE_HISTORY_SENSITIVE_FIELDS,
        keyId
      );
      
      // Create blind indexes for searchable fields
      const blindIndexes = await this.createBlindIndexes(caseHistoryData, keyId);
      
      return {
        encryptedData,
        blindIndexes,
        nonSensitiveData
      };
    } catch (error) {
      console.error('Error encrypting case history data:', error.message);
      throw new Error(`Failed to encrypt case history data: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive fields in case history data
   * @param {Object} encryptedData - Encrypted data from database
   * @param {string} keyId - Encryption key ID
   * @returns {Promise<Object>} Decrypted data
   */
  static async decryptData(encryptedData, keyId) {
    try {
      if (!encryptedData || Object.keys(encryptedData).length === 0) {
        return {};
      }
      
      const decryptedData = await enhancedEncryptionService.decryptObject(
        encryptedData,
        CASE_HISTORY_SENSITIVE_FIELDS,
        keyId
      );
      
      return decryptedData;
    } catch (error) {
      console.error('Error decrypting case history data:', error.message);
      throw new Error(`Failed to decrypt case history data: ${error.message}`);
    }
  }

  /**
   * Find case history by user ID and partner ID
   * @param {number} userId - User ID
   * @param {number} partnerId - Partner ID
   * @param {Object} options - Options (includeDecrypted, user)
   * @returns {Promise<Object|null>} Case history record
   */
  static async findByUserIdAndPartnerId(userId, partnerId, options = {}) {
    try {
      const { includeDecrypted = true, user = null } = options;
      
      const query = `
        SELECT * FROM case_histories 
        WHERE user_id = $1 AND partner_id = $2
      `;
      
      const result = await db.query(query, [userId, partnerId]);
      const record = result.rows[0];
      
      if (!record) {
        return null;
      }
      
      // Decrypt if requested and encrypted data exists
      if (includeDecrypted && record.encrypted_data && record.encryption_key_id) {
        try {
          const decryptedData = await this.decryptData(
            record.encrypted_data,
            record.encryption_key_id
          );
          
          // Merge decrypted data with original record
          const decryptedRecord = { ...record, ...decryptedData };
          
          // Log decryption for audit
          if (user) {
            await auditService.logEncryption(
              'decrypt',
              'case_history',
              record.id,
              user,
              record.encryption_key_id,
              record.encryption_version,
              true
            );
          }
          
          return decryptedRecord;
        } catch (error) {
          console.error('Error decrypting case history record:', error.message);
          
          // Log decryption failure
          if (user) {
            await auditService.logEncryption(
              'decrypt',
              'case_history',
              record.id,
              user,
              record.encryption_key_id,
              record.encryption_version,
              false,
              error
            );
          }
          
          // Return record with encrypted data if decryption fails
          return record;
        }
      }
      
      return record;
    } catch (error) {
      console.error('Error finding case history:', error.message);
      throw new Error(`Failed to find case history: ${error.message}`);
    }
  }

  /**
   * Create or update case history with encryption
   * @param {Object} caseHistoryData - Case history data
   * @param {Object} client - Database client (optional)
   * @returns {Promise<Object>} Created/updated case history record
   */
  static async createOrUpdate(caseHistoryData, client = null) {
    const dbClient = client || db;
    
    try {
      const {
        user_id,
        partner_id,
        organization_id,
        ...otherData
      } = caseHistoryData;
      
      if (!organization_id) {
        throw new Error('Organization ID is required for encryption');
      }
      
      // Get or create encryption key for the organization
      const encryptionKeyId = await this.getEncryptionKey(organization_id);
      
      // Encrypt sensitive data
      const { encryptedData, blindIndexes, nonSensitiveData } = await this.encryptData(
        otherData,
        encryptionKeyId
      );
      
      // Check if case history exists
      const existing = await this.findByUserIdAndPartnerId(user_id, partner_id, { 
        includeDecrypted: false 
      });
      
      if (existing) {
        // Update existing record
        return await this.updateExisting(
          existing.id,
          {
            user_id,
            partner_id,
            organization_id,
            ...nonSensitiveData
          },
          encryptedData,
          blindIndexes,
          encryptionKeyId,
          dbClient
        );
      } else {
        // Create new record
        return await this.createNew(
          {
            user_id,
            partner_id,
            organization_id,
            ...nonSensitiveData
          },
          encryptedData,
          blindIndexes,
          encryptionKeyId,
          dbClient
        );
      }
    } catch (error) {
      console.error('Error in createOrUpdate:', error.message);
      throw error;
    }
  }

  /**
   * Create new case history record with encryption
   * @private
   */
  static async createNew(nonSensitiveData, encryptedData, blindIndexes, encryptionKeyId, dbClient) {
    try {
      const columns = [
        'user_id', 'partner_id', 'organization_id', ...Object.keys(nonSensitiveData),
        'encrypted_data', 'blind_indexes', 'encryption_key_id', 'encryption_version'
      ];
      
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const values = [
        nonSensitiveData.user_id,
        nonSensitiveData.partner_id,
        nonSensitiveData.organization_id,
        ...Object.values(nonSensitiveData).slice(3), // Skip user_id, partner_id, organization_id
        JSON.stringify(encryptedData),
        JSON.stringify(blindIndexes),
        encryptionKeyId,
        1 // encryption_version
      ];
      
      const query = `
        INSERT INTO case_histories (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await dbClient.query(query, values);
      
      // Log successful encryption
      // Note: User logging would need to be passed from controller
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating case history:', error.message);
      throw new Error(`Failed to create case history: ${error.message}`);
    }
  }

  /**
   * Update existing case history record with encryption
   * @private
   */
  static async updateExisting(id, nonSensitiveData, encryptedData, blindIndexes, encryptionKeyId, dbClient) {
    try {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      // Add non-sensitive fields
      for (const [key, value] of Object.entries(nonSensitiveData)) {
        if (key !== 'user_id' && key !== 'partner_id' && key !== 'organization_id') {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      // Add encrypted data fields
      setClauses.push(`encrypted_data = $${paramIndex}`);
      values.push(JSON.stringify(encryptedData));
      paramIndex++;
      
      setClauses.push(`blind_indexes = $${paramIndex}`);
      values.push(JSON.stringify(blindIndexes));
      paramIndex++;
      
      setClauses.push(`encryption_key_id = $${paramIndex}`);
      values.push(encryptionKeyId);
      paramIndex++;
      
      setClauses.push(`encryption_version = $${paramIndex}`);
      values.push(1);
      paramIndex++;
      
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add WHERE clause parameter
      values.push(id);
      
      const query = `
        UPDATE case_histories 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await dbClient.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating case history:', error.message);
      throw new Error(`Failed to update case history: ${error.message}`);
    }
  }

  /**
   * Search case histories by encrypted field using blind index
   * @param {string} field - Field to search
   * @param {string} searchTerm - Search term
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Array>} Matching case histories
   */
  static async searchByEncryptedField(field, searchTerm, organizationId) {
    try {
      if (!SEARCHABLE_ENCRYPTED_FIELDS.case_history.includes(field)) {
        throw new Error(`Field ${field} is not searchable`);
      }
      
      // Get organization's encryption key
      const keyId = await this.getEncryptionKey(organizationId);
      const keyInfo = await enhancedEncryptionService.getKeyInfo(keyId);
      
      // Create blind index for search
      const blindIndexKey = `blind_index_${keyInfo.organization_id}`;
      const blindIndex = enhancedEncryptionService.createBlindIndex(
        searchTerm,
        blindIndexKey
      );
      
      // Search using blind index
      const query = `
        SELECT * FROM case_histories 
        WHERE organization_id = $1 
        AND blind_indexes->>$2 = $3
      `;
      
      const result = await db.query(query, [organizationId, field, blindIndex]);
      
      // Decrypt results
      const decryptedResults = [];
      for (const record of result.rows) {
        if (record.encrypted_data && record.encryption_key_id) {
          const decryptedData = await this.decryptData(
            record.encrypted_data,
            record.encryption_key_id
          );
          decryptedResults.push({ ...record, ...decryptedData });
        } else {
          decryptedResults.push(record);
        }
      }
      
      return decryptedResults;
    } catch (error) {
      console.error('Error searching by encrypted field:', error.message);
      throw new Error(`Failed to search encrypted field: ${error.message}`);
    }
  }

  /**
   * Get encryption status for a case history record
   * @param {number} id - Case history ID
   * @returns {Promise<Object>} Encryption status
   */
  static async getEncryptionStatus(id) {
    try {
      const query = `
        SELECT 
          id,
          encrypted_data IS NOT NULL as is_encrypted,
          encryption_key_id,
          encryption_version,
          blind_indexes IS NOT NULL as has_blind_indexes,
          created_at,
          updated_at
        FROM case_histories 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting encryption status:', error.message);
      throw new Error(`Failed to get encryption status: ${error.message}`);
    }
  }

  /**
   * Re-encrypt case history data with new key (for key rotation)
   * @param {number} id - Case history ID
   * @param {string} newKeyId - New encryption key ID
   * @returns {Promise<Object>} Updated case history
   */
  static async reencrypt(id, newKeyId) {
    try {
      // Get current record
      const current = await this.findByUserIdAndPartnerId(
        (await db.query('SELECT user_id, partner_id FROM case_histories WHERE id = $1', [id])).rows[0].user_id,
        (await db.query('SELECT user_id, partner_id FROM case_histories WHERE id = $1', [id])).rows[0].partner_id,
        { includeDecrypted: true }
      );
      
      if (!current || !current.encrypted_data) {
        throw new Error('Case history not found or not encrypted');
      }
      
      // Re-encrypt with new key
      const { encryptedData, blindIndexes } = await this.encryptData(current, newKeyId);
      
      // Update record
      const query = `
        UPDATE case_histories 
        SET encrypted_data = $1, blind_indexes = $2, encryption_key_id = $3, encryption_version = $4
        WHERE id = $5
        RETURNING *
      `;
      
      const result = await db.query(query, [
        JSON.stringify(encryptedData),
        JSON.stringify(blindIndexes),
        newKeyId,
        (current.encryption_version || 1) + 1,
        id
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error re-encrypting case history:', error.message);
      throw new Error(`Failed to re-encrypt case history: ${error.message}`);
    }
  }
}

module.exports = CaseHistory;