const db = require('../config/database');
const enhancedEncryptionService = require('../services/enhancedEncryptionService');
const auditService = require('../services/auditService');
const { 
  MENTAL_STATUS_SENSITIVE_FIELDS, 
  SEARCHABLE_ENCRYPTED_FIELDS,
  DATA_TYPE_MAPPINGS,
  AUDIT_OPERATIONS
} = require('../utils/encryptionConstants');

/**
 * Enhanced MentalStatusExamination Model with HIPAA/GDPR Encryption Support
 * Implements field-level encryption for sensitive psychological assessment data
 */

// Keep the list of columns for model consistency
const MSE_FIELDS = [
  'general_appearance_appearance',
  'general_appearance_age',
  'general_appearance_touch_with_surroundings',
  'general_appearance_eye_contact',
  'general_appearance_hair',
  'general_appearance_rapport',
  'general_appearance_comments',
  'attitude',
  'attitude_manner_of_relating',
  'attitude_rapport',
  'motor_behavior',
  'speech_intensity_tone',
  'speech_reaction_time',
  'speech_speed',
  'speech_prosody_tempo',
  'speech_ease_of_speech',
  'speech_productivity_volume',
  'speech_relevant_irrelevant',
  'speech_coherent_incoherent',
  'speech_goal_direction',
  'volition_made_phenomenon',
  'volition_somatic_passivity',
  'volition_echolalia_echopraxia',
  'cognitive_attention_concentration',
  'cognitive_attention',
  'cognitive_orientation_time',
  'cognitive_orientation_space',
  'cognitive_orientation_person',
  'cognitive_orientation_situation',
  'cognitive_orientation_sense_of_passage_of_time',
  'cognitive_memory_immediate_digit_forward',
  'cognitive_memory_immediate_digit_backward',
  'cognitive_memory_immediate_word_recall',
  'cognitive_memory_immediate',
  'cognitive_memory_recent',
  'cognitive_memory_remote',
  'cognitive_abstract_ability',
  'intelligence_general_information',
  'intelligence_calculation',
  'intelligence_global_impression',
  'intelligence_comprehension',
  'intelligence_vocabulary',
  'mood_affect_subjective',
  'mood_affect_diurnal_variation',
  'mood_affect_objective',
  'mood_affect_depth',
  'mood_affect_range',
  'mood_affect_stability',
  'mood_affect_congruence_to_thought',
  'mood_affect_appropriate_to_situation',
  'mood_affect_communicability',
  'mood_affect_reactivity_to_stimulus',
  'thought_stream',
  'thought_stream_normal',
  'thought_stream_retarded',
  'thought_stream_retarded_thought_blocking',
  'thought_stream_retarded_circumstantiality',
  'thought_stream_accelerated',
  'thought_stream_accelerated_flight_of_ideas',
  'thought_stream_accelerated_prolixity',
  'thought_stream_accelerated_pressure_of_speech',
  'thought_form',
  'thought_form_sample_talk',
  'thought_possession_obsessions_compulsions',
  'thought_possession_thought_alienation',
  'thought_possession_thought_alienation_insertion',
  'thought_possession_thought_alienation_broadcasting',
  'thought_possession_thought_alienation_withdrawal',
  'thought_possession_sample_talk',
  'thought_content_religious_preoccupation',
  'thought_content_phobias',
  'thought_content_ideas',
  'thought_content_ideas_hopelessness',
  'thought_content_ideas_helplessness',
  'thought_content_ideas_worthlessness',
  'thought_content_ideas_guilt',
  'thought_content_ideas_death_wishes',
  'thought_content_ideas_suicide',
  'thought_content_ideas_homicide',
  'thought_content_ideas_hypochondriacal',
  'thought_content_delusions_primary',
  'thought_content_delusions_secondary',
  'thought_content_delusions_systematised',
  'thought_content_delusions_mood_congruent',
  'thought_content_delusions_types',
  'thought_content_delusions_sample_talk',
  'perceptual_sensory_distortion',
  'perceptual_sensory_deception',
  'perceptual_projection',
  'perceptual_modality',
  'perceptual_content',
  'perceptual_response_to_content',
  'perceptual_frequency_diurnal_pattern',
  'perceptual_thought_echo',
  'perceptual_description',
  'perceptual_others',
  'other_psychotic_phenomena',
  'other_psychopathological_phenomena',
  'judgement_test',
  'judgement_social',
  'judgement_personal',
  'insight',
  'insight_details',
  'verbatim_report'
];

class MentalStatusExamination {
  static get fields() {
    return MSE_FIELDS;
  }

  /**
   * Get encryption key for mental status examination data
   * @param {number} organizationId - Organization ID
   * @returns {Promise<string>} Encryption key ID
   */
  static async getEncryptionKey(organizationId) {
    try {
      // Check if organization already has a mental status key
      const query = `
        SELECT key_id FROM encryption_keys 
        WHERE organization_id = $1 AND data_type = 'mental_status' AND status = 'active'
        ORDER BY created_at DESC LIMIT 1
      `;
      
      const result = await db.query(query, [organizationId]);
      
      if (result.rows.length > 0) {
        return result.rows[0].key_id;
      }
      
      // Generate new key if none exists
      const keyData = await enhancedEncryptionService.generateDataKey(
        organizationId, 
        'mental_status'
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
   * Encrypt sensitive fields in mental status examination data
   * @param {Object} mentalStatusData - Mental status examination data to encrypt
   * @param {string} keyId - Encryption key ID
   * @returns {Promise<Object>} Object with encrypted data
   */
  static async encryptData(mentalStatusData, keyId) {
    try {
      // Extract sensitive fields for encryption
      const sensitiveData = {};
      const nonSensitiveData = {};
      
      for (const [key, value] of Object.entries(mentalStatusData)) {
        if (MENTAL_STATUS_SENSITIVE_FIELDS.includes(key)) {
          sensitiveData[key] = value;
        } else {
          nonSensitiveData[key] = value;
        }
      }
      
      // Encrypt sensitive fields
      const encryptedData = await enhancedEncryptionService.encryptObject(
        sensitiveData,
        MENTAL_STATUS_SENSITIVE_FIELDS,
        keyId
      );
      
      return {
        encryptedData,
        nonSensitiveData
      };
    } catch (error) {
      console.error('Error encrypting mental status data:', error.message);
      throw new Error(`Failed to encrypt mental status data: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive fields in mental status examination data
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
        MENTAL_STATUS_SENSITIVE_FIELDS,
        keyId
      );
      
      return decryptedData;
    } catch (error) {
      console.error('Error decrypting mental status data:', error.message);
      throw new Error(`Failed to decrypt mental status data: ${error.message}`);
    }
  }

  /**
   * Find mental status examination by user ID and partner ID
   * @param {number} userId - User ID
   * @param {number} partnerId - Partner ID
   * @param {Object} options - Options (includeDecrypted, user)
   * @returns {Promise<Object|null>} Mental status examination record
   */
  static async findByUserIdAndPartnerId(userId, partnerId, options = {}) {
    try {
      const { includeDecrypted = true, user = null } = options;
      
      const query = `
        SELECT * FROM mental_status_examinations 
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
              'mental_status',
              record.id,
              user,
              record.encryption_key_id,
              record.encryption_version,
              true
            );
          }
          
          return decryptedRecord;
        } catch (error) {
          console.error('Error decrypting mental status record:', error.message);
          
          // Log decryption failure
          if (user) {
            await auditService.logEncryption(
              'decrypt',
              'mental_status',
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
      console.error('Error finding mental status examination:', error.message);
      throw new Error(`Failed to find mental status examination: ${error.message}`);
    }
  }

  /**
   * Build payload for mental status examination with encryption
   * @param {Object} mentalStatus - Mental status data
   * @param {number} userId - User ID
   * @param {number} partnerId - Partner ID
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Object>} Payload with encrypted data
   */
  static async buildEncryptedPayload(mentalStatus, userId, partnerId, organizationId) {
    try {
      const payload = {
        user_id: parseInt(userId, 10),
        partner_id: partnerId,
        organization_id: organizationId
      };

      // Add all fields from mental status data
      MSE_FIELDS.forEach((field) => {
        payload[field] = mentalStatus?.[field] ?? null;
      });

      return payload;
    } catch (error) {
      console.error('Error building encrypted payload:', error.message);
      throw new Error(`Failed to build encrypted payload: ${error.message}`);
    }
  }

  /**
   * Save or update mental status examination with encryption
   * @param {Object} mentalStatusData - Mental status examination data
   * @param {Object} client - Database client (optional)
   * @returns {Promise<Object>} Saved mental status examination record
   */
  static async saveOrUpdate(mentalStatusData, client = null) {
    const dbClient = client || db;
    
    try {
      const {
        user_id,
        partner_id,
        organization_id,
        ...otherData
      } = mentalStatusData;
      
      if (!organization_id) {
        throw new Error('Organization ID is required for encryption');
      }
      
      // Get or create encryption key for the organization
      const encryptionKeyId = await this.getEncryptionKey(organization_id);
      
      // Encrypt sensitive data
      const { encryptedData, nonSensitiveData } = await this.encryptData(
        otherData,
        encryptionKeyId
      );
      
      // Check if mental status examination exists
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
          encryptionKeyId,
          dbClient
        );
      }
    } catch (error) {
      console.error('Error in saveOrUpdate:', error.message);
      throw error;
    }
  }

  /**
   * Create new mental status examination record with encryption
   * @private
   */
  static async createNew(nonSensitiveData, encryptedData, encryptionKeyId, dbClient) {
    try {
      const columns = [
        'user_id', 'partner_id', 'organization_id',
        'encrypted_data', 'encryption_key_id', 'encryption_version'
      ];
      
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const values = [
        nonSensitiveData.user_id,
        nonSensitiveData.partner_id,
        nonSensitiveData.organization_id,
        JSON.stringify(encryptedData),
        encryptionKeyId,
        1 // encryption_version
      ];
      
      const query = `
        INSERT INTO mental_status_examinations (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await dbClient.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating mental status examination:', error.message);
      throw new Error(`Failed to create mental status examination: ${error.message}`);
    }
  }

  /**
   * Update existing mental status examination record with encryption
   * @private
   */
  static async updateExisting(id, nonSensitiveData, encryptedData, encryptionKeyId, dbClient) {
    try {
      const query = `
        UPDATE mental_status_examinations 
        SET 
          user_id = $1,
          partner_id = $2,
          organization_id = $3,
          encrypted_data = $4,
          encryption_key_id = $5,
          encryption_version = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      
      const values = [
        nonSensitiveData.user_id,
        nonSensitiveData.partner_id,
        nonSensitiveData.organization_id,
        JSON.stringify(encryptedData),
        encryptionKeyId,
        1, // encryption_version
        id
      ];
      
      const result = await dbClient.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating mental status examination:', error.message);
      throw new Error(`Failed to update mental status examination: ${error.message}`);
    }
  }

  /**
   * Get encryption status for a mental status examination record
   * @param {number} id - Mental status examination ID
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
          created_at,
          updated_at
        FROM mental_status_examinations 
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
   * Re-encrypt mental status examination data with new key (for key rotation)
   * @param {number} id - Mental status examination ID
   * @param {string} newKeyId - New encryption key ID
   * @returns {Promise<Object>} Updated mental status examination
   */
  static async reencrypt(id, newKeyId) {
    try {
      // Get current record
      const current = await this.findByUserIdAndPartnerId(
        (await db.query('SELECT user_id, partner_id FROM mental_status_examinations WHERE id = $1', [id])).rows[0].user_id,
        (await db.query('SELECT user_id, partner_id FROM mental_status_examinations WHERE id = $1', [id])).rows[0].partner_id,
        { includeDecrypted: true }
      );
      
      if (!current || !current.encrypted_data) {
        throw new Error('Mental status examination not found or not encrypted');
      }
      
      // Re-encrypt with new key
      const { encryptedData } = await this.encryptData(current, newKeyId);
      
      // Update record
      const query = `
        UPDATE mental_status_examinations 
        SET encrypted_data = $1, encryption_key_id = $2, encryption_version = $3
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await db.query(query, [
        JSON.stringify(encryptedData),
        newKeyId,
        (current.encryption_version || 1) + 1,
        id
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error re-encrypting mental status examination:', error.message);
      throw new Error(`Failed to re-encrypt mental status examination: ${error.message}`);
    }
  }
}

module.exports = MentalStatusExamination;