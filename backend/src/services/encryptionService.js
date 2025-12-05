const crypto = require('crypto');

/**
 * Encryption Service for Google Calendar OAuth Tokens
 * Uses AES-256-GCM encryption for secure token storage
 *
 * Environment Requirements:
 * - ENCRYPTION_KEY: 32-character random string for encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const SALT_LENGTH = 64; // Salt length
const TAG_LENGTH = 16; // Authentication tag length
const KEY_LENGTH = 32; // Key length for AES-256

/**
 * Get encryption key from environment
 * @returns {Buffer} Encryption key as buffer
 * @throws {Error} If ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters long`);
  }

  return Buffer.from(key, 'utf8');
}

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text in format: iv:salt:encrypted:authTag (hex encoded)
 * @throws {Error} If encryption fails
 */
function encrypt(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text to encrypt must be a non-empty string');
    }

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Get encryption key
    const key = getEncryptionKey();

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
 * Decrypt text that was encrypted with encrypt()
 * @param {string} encryptedText - Encrypted text in format: iv:salt:encrypted:authTag
 * @returns {string} Decrypted plain text
 * @throws {Error} If decryption fails or data is tampered
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('Encrypted text must be a non-empty string');
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

    // Get encryption key
    const key = getEncryptionKey();

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
 * Use this once to generate the ENCRYPTION_KEY for environment variables
 * @returns {string} 32-character random string suitable for ENCRYPTION_KEY
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex').substring(0, KEY_LENGTH);
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey
};
