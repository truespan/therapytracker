const crypto = require('crypto');
const db = require('../config/database');

/**
 * Enhanced Encryption Service for HIPAA & GDPR Compliance
 * Implements hierarchical key management and field-level encryption
 * 
 * Environment Requirements:
 * - MASTER_ENCRYPTION_KEY: 32-character master key for key encryption
 * - ENCRYPTION_KEY: Legacy key for backward compatibility
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

class EnhancedEncryptionService {
  constructor() {
    this.keyCache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get master encryption key from environment
   * @returns {Buffer} Master encryption key as buffer
   * @throws {Error} If MASTER_ENCRYPTION_KEY is not set or invalid
   */
  getMasterKey() {
    const key = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is not set');
    }

    if (key.length !== KEY_LENGTH) {
      throw new Error(`MASTER_ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters long`);
    }

    return Buffer.from(key, 'utf8');
  }

  /**
   * Get legacy encryption key for backward compatibility
   * @returns {Buffer} Legacy encryption key as buffer
   */
  getLegacyKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      // Fallback to master key if legacy key not available
      console.warn('ENCRYPTION_KEY not set, using MASTER_ENCRYPTION_KEY for backward compatibility');
      return this.getMasterKey();
    }

    if (key.length !== KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters long`);
    }

    return Buffer.from(key, 'utf8');
  }

  /**
   * Encrypt text using AES-256-GCM
   * @param {string} text - Plain text to encrypt
   * @param {Buffer} key - Encryption key (32 bytes)
   * @returns {string} Encrypted text in format: iv:salt:encrypted:authTag (hex encoded)
   * @throws {Error} If encryption fails
   */
  encryptWithKey(text, key) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text to encrypt must be a non-empty string');
      }

      if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
        throw new Error('Encryption key must be a 32-byte Buffer');
      }

      // Generate random IV and salt
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Return combined string: iv:salt:encrypted:authTag
      return `${iv.toString('hex')}:${salt.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypt text that was encrypted with encryptWithKey()
   * @param {string} encryptedText - Encrypted text in format: iv:salt:encrypted:authTag
   * @param {Buffer} key - Encryption key (32 bytes)
   * @returns {string} Decrypted plain text
   * @throws {Error} If decryption fails or data is tampered
   */
  decryptWithKey(encryptedText, key) {
    try {
      if (!encryptedText || typeof encryptedText !== 'string') {
        throw new Error('Encrypted text must be a non-empty string');
      }

      if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
        throw new Error('Encryption key must be a 32-byte Buffer');
      }

      // Split the encrypted string
      const parts = encryptedText.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted text format');
      }

      const [ivHex, saltHex, encrypted, authTagHex] = parts;

      // Convert from hex to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate lengths
      if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  /**
   * Generate a secure random encryption key
   * @returns {string} 32-character random string suitable for encryption key
   */
  generateKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex').substring(0, KEY_LENGTH);
  }

  /**
   * Generate a data encryption key for a specific organization and data type
   * @param {number} organizationId - Organization ID
   * @param {string} dataType - Type of data (e.g., 'case_history', 'mental_status')
   * @returns {Promise<Object>} Key object with id, encrypted key, and metadata
   */
  async generateDataKey(organizationId, dataType) {
    try {
      // Generate new random key
      const plainKey = this.generateKey();
      const masterKey = this.getMasterKey();
      
      // Encrypt the data key with master key
      const encryptedKey = this.encryptWithKey(plainKey, masterKey);
      const keyId = `dek_${organizationId}_${dataType}_${Date.now()}`;
      
      // Store in database
      const query = `
        INSERT INTO encryption_keys (key_id, key_type, encrypted_key, organization_id, data_type, version)
        VALUES ($1, 'data', $2, $3, $4, 1)
        RETURNING id, key_id, version, created_at
      `;
      
      const result = await db.query(query, [keyId, encryptedKey, organizationId, dataType]);
      
      // Cache the plain key for performance
      this.cacheKey(keyId, plainKey);
      
      return {
        keyId,
        plainKey,
        encryptedKey,
        dbRecord: result.rows[0]
      };
    } catch (error) {
      console.error('Error generating data key:', error.message);
      throw new Error(`Failed to generate data key: ${error.message}`);
    }
  }

  /**
   * Generate an organization encryption key
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Object>} Key object with id, encrypted key, and metadata
   */
  async generateOrganizationKey(organizationId) {
    try {
      const plainKey = this.generateKey();
      const masterKey = this.getMasterKey();
      
      const encryptedKey = this.encryptWithKey(plainKey, masterKey);
      const keyId = `ok_${organizationId}_${Date.now()}`;
      
      const query = `
        INSERT INTO encryption_keys (key_id, key_type, encrypted_key, organization_id, version)
        VALUES ($1, 'organization', $2, $3, 1)
        RETURNING id, key_id, version, created_at
      `;
      
      const result = await db.query(query, [keyId, encryptedKey, organizationId]);
      
      this.cacheKey(keyId, plainKey);
      
      return {
        keyId,
        plainKey,
        encryptedKey,
        dbRecord: result.rows[0]
      };
    } catch (error) {
      console.error('Error generating organization key:', error.message);
      throw new Error(`Failed to generate organization key: ${error.message}`);
    }
  }

  /**
   * Get a decryption key from database or cache
   * @param {string} keyId - Key identifier
   * @returns {Promise<Buffer>} Decryption key as Buffer
   */
  async getDecryptionKey(keyId) {
    try {
      // Check cache first
      const cachedKey = this.getCachedKey(keyId);
      if (cachedKey) {
        return Buffer.from(cachedKey, 'utf8');
      }
      
      // Fetch from database
      const query = `
        SELECT encrypted_key, key_type 
        FROM encryption_keys 
        WHERE key_id = $1 AND status = 'active'
      `;
      
      const result = await db.query(query, [keyId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Key not found or inactive: ${keyId}`);
      }
      
      const { encrypted_key: encryptedKey, key_type: keyType } = result.rows[0];
      const masterKey = this.getMasterKey();
      
      // Decrypt the key
      const plainKey = this.decryptWithKey(encryptedKey, masterKey);
      
      // Cache for performance
      this.cacheKey(keyId, plainKey);
      
      return Buffer.from(plainKey, 'utf8');
    } catch (error) {
      console.error('Error getting decryption key:', error.message);
      throw new Error(`Failed to get decryption key: ${error.message}`);
    }
  }

  /**
   * Encrypt text using a key identifier (fetches key automatically)
   * @param {string} text - Plain text to encrypt
   * @param {string} keyId - Key identifier
   * @returns {Promise<string>} Encrypted text
   */
  async encrypt(text, keyId) {
    try {
      const key = await this.getDecryptionKey(keyId);
      return this.encryptWithKey(text, key);
    } catch (error) {
      console.error('Error in encrypt:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt text using a key identifier (fetches key automatically)
   * @param {string} encryptedText - Encrypted text
   * @param {string} keyId - Key identifier
   * @returns {Promise<string>} Decrypted plain text
   */
  async decrypt(encryptedText, keyId) {
    try {
      const key = await this.getDecryptionKey(keyId);
      return this.decryptWithKey(encryptedText, key);
    } catch (error) {
      console.error('Error in decrypt:', error.message);
      throw error;
    }
  }

  /**
   * Encrypt specific fields in an object
   * @param {Object} dataObject - Object containing data to encrypt
   * @param {Array<string>} fieldsToEncrypt - Array of field names to encrypt
   * @param {string} keyId - Key identifier
   * @returns {Promise<Object>} Object with encrypted fields
   */
  async encryptObject(dataObject, fieldsToEncrypt, keyId) {
    try {
      const encryptedObject = { ...dataObject };
      const key = await this.getDecryptionKey(keyId);
      
      for (const field of fieldsToEncrypt) {
        if (dataObject[field] !== null && dataObject[field] !== undefined) {
          const value = String(dataObject[field]);
          encryptedObject[field] = this.encryptWithKey(value, key);
        }
      }
      
      return encryptedObject;
    } catch (error) {
      console.error('Error encrypting object:', error.message);
      throw new Error(`Failed to encrypt object: ${error.message}`);
    }
  }

  /**
   * Decrypt specific fields in an object
   * @param {Object} encryptedObject - Object containing encrypted data
   * @param {Array<string>} fieldsToDecrypt - Array of field names to decrypt
   * @param {string} keyId - Key identifier
   * @returns {Promise<Object>} Object with decrypted fields
   */
  async decryptObject(encryptedObject, fieldsToDecrypt, keyId) {
    try {
      const decryptedObject = { ...encryptedObject };
      const key = await this.getDecryptionKey(keyId);
      
      for (const field of fieldsToDecrypt) {
        if (encryptedObject[field] !== null && encryptedObject[field] !== undefined) {
          const encryptedValue = String(encryptedObject[field]);
          decryptedObject[field] = this.decryptWithKey(encryptedValue, key);
        }
      }
      
      return decryptedObject;
    } catch (error) {
      console.error('Error decrypting object:', error.message);
      throw new Error(`Failed to decrypt object: ${error.message}`);
    }
  }

  /**
   * Create a blind index for searchable encryption
   * @param {string} plaintext - Text to index
   * @param {string} key - Indexing key (should be different from encryption key)
   * @returns {string} Blind index hash
   */
  createBlindIndex(plaintext, key) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }
      
      return crypto.createHmac('sha256', key).update(plaintext.toLowerCase()).digest('hex');
    } catch (error) {
      console.error('Error creating blind index:', error.message);
      throw new Error(`Failed to create blind index: ${error.message}`);
    }
  }

  /**
   * Cache a key for performance
   * @param {string} keyId - Key identifier
   * @param {string} plainKey - Plain text key
   */
  cacheKey(keyId, plainKey) {
    this.keyCache.set(keyId, {
      key: plainKey,
      timestamp: Date.now()
    });
  }

  /**
   * Get a cached key
   * @param {string} keyId - Key identifier
   * @returns {string|null} Cached key or null if not found/expired
   */
  getCachedKey(keyId) {
    const item = this.keyCache.get(keyId);
    if (item && Date.now() - item.timestamp < this.cacheTTL) {
      return item.key;
    }
    this.keyCache.delete(keyId);
    return null;
  }

  /**
   * Clear expired keys from cache
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [keyId, item] of this.keyCache.entries()) {
      if (now - item.timestamp >= this.cacheTTL) {
        this.keyCache.delete(keyId);
      }
    }
  }

  /**
   * Get key information from database
   * @param {string} keyId - Key identifier
   * @returns {Promise<Object>} Key information
   */
  async getKeyInfo(keyId) {
    try {
      const query = `
        SELECT id, key_id, key_type, organization_id, data_type, 
               version, status, created_at, rotated_at
        FROM encryption_keys 
        WHERE key_id = $1
      `;
      
      const result = await db.query(query, [keyId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting key info:', error.message);
      throw new Error(`Failed to get key info: ${error.message}`);
    }
  }

  /**
   * Get all active keys for an organization
   * @param {number} organizationId - Organization ID
   * @returns {Promise<Array>} Array of key information
   */
  async getOrganizationKeys(organizationId) {
    try {
      const query = `
        SELECT id, key_id, key_type, data_type, version, status, created_at, rotated_at
        FROM encryption_keys 
        WHERE organization_id = $1 AND status = 'active'
        ORDER BY key_type, data_type, created_at DESC
      `;
      
      const result = await db.query(query, [organizationId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting organization keys:', error.message);
      throw new Error(`Failed to get organization keys: ${error.message}`);
    }
  }
}

// Create singleton instance
const enhancedEncryptionService = new EnhancedEncryptionService();

// Clear expired cache entries every 5 minutes
setInterval(() => {
  enhancedEncryptionService.clearExpiredCache();
}, 5 * 60 * 1000);

module.exports = enhancedEncryptionService;