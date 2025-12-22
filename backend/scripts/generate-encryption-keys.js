#!/usr/bin/env node

/**
 * Encryption Key Generation Utility
 * Generates secure encryption keys for HIPAA & GDPR compliance
 * 
 * Usage: node generate-encryption-keys.js [options]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class KeyGenerator {
  constructor() {
    this.keys = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Generate a secure random encryption key (32 characters)
   * @returns {string} 32-character encryption key
   */
  generateKey() {
    return crypto.randomBytes(32).toString('hex').substring(0, 32);
  }

  /**
   * Generate all required encryption keys
   */
  generateAllKeys() {
    console.log(`${colors.cyan}${colors.bright}🔐 Generating Encryption Keys for HIPAA & GDPR Compliance${colors.reset}\n`);

    // Master encryption key (most important)
    this.keys.masterKey = this.generateKey();
    console.log(`${colors.green}✓${colors.reset} Master Encryption Key: ${colors.yellow}${this.keys.masterKey}${colors.reset}`);
    console.log(`  └─ Used to encrypt all other keys in the system`);
    console.log(`  └─ ${colors.red}CRITICAL: Store this in a secure vault (AWS KMS, Azure Key Vault, etc.)${colors.reset}\n`);

    // Legacy encryption key (backward compatibility)
    this.keys.legacyKey = this.generateKey();
    console.log(`${colors.green}✓${colors.reset} Legacy Encryption Key: ${colors.yellow}${this.keys.legacyKey}${colors.reset}`);
    console.log(`  └─ Used for existing encrypted data (Google Calendar tokens, etc.)`);
    console.log(`  └─ ${colors.red}IMPORTANT: Keep secure but separate from master key${colors.reset}\n`);

    // Backup encryption key
    this.keys.backupKey = this.generateKey();
    console.log(`${colors.green}✓${colors.reset} Backup Encryption Key: ${colors.yellow}${this.keys.backupKey}${colors.reset}`);
    console.log(`  └─ Used for encrypted database backups`);
    console.log(`  └─ ${colors.red}IMPORTANT: Store in separate secure location${colors.reset}\n`);

    // Emergency access key
    this.keys.emergencyKey = this.generateKey();
    console.log(`${colors.green}✓${colors.reset} Emergency Access Key: ${colors.yellow}${this.keys.emergencyKey}${colors.reset}`);
    console.log(`  └─ For disaster recovery and emergency access`);
    console.log(`  └─ ${colors.red}CRITICAL: Store offline in secure physical location${colors.reset}\n`);

    // Test/demo keys (for development only)
    this.keys.testKey = this.generateKey();
    console.log(`${colors.green}✓${colors.reset} Test/Demo Key: ${colors.yellow}${this.keys.testKey}${colors.reset}`);
    console.log(`  └─ For development and testing environments only`);
    console.log(`  └─ ${colors.red}WARNING: Do not use in production${colors.reset}\n`);

    return this.keys;
  }

  /**
   * Validate encryption key
   * @param {string} key - Key to validate
   * @returns {boolean} True if valid
   */
  validateKey(key) {
    return typeof key === 'string' && key.length === 32 && /^[a-f0-9]{32}$/.test(key);
  }

  /**
   * Create .env file with encryption keys
   */
  createEnvFile() {
    const envTemplate = `# HIPAA & GDPR Encryption Configuration
# Generated on: ${new Date().toISOString()}
# WARNING: Keep this file secure and never commit to version control!

# =============================================================================
# MASTER ENCRYPTION KEY (CRITICAL - KEEP SECURE!)
# =============================================================================
# This key encrypts all other encryption keys in the system
MASTER_ENCRYPTION_KEY=${this.keys.masterKey}

# =============================================================================
# LEGACY ENCRYPTION KEY (Backward Compatibility)
# =============================================================================
# Used for existing encrypted data (Google Calendar tokens, etc.)
ENCRYPTION_KEY=${this.keys.legacyKey}

# =============================================================================
# BACKUP ENCRYPTION KEY
# =============================================================================
# Used for encrypted database backups
BACKUP_ENCRYPTION_KEY=${this.keys.backupKey}

# =============================================================================
# EMERGENCY ACCESS KEY
# =============================================================================
# For disaster recovery and emergency access
EMERGENCY_ACCESS_KEY=${this.keys.emergencyKey}

# =============================================================================
# TEST/DEMO KEY (Development Only)
# =============================================================================
# For development and testing environments only
TEST_ENCRYPTION_KEY=${this.keys.testKey}

# =============================================================================
# ENCRYPTION SERVICE CONFIGURATION
# =============================================================================
# Key cache TTL in milliseconds (default: 15 minutes)
ENCRYPTION_KEY_CACHE_TTL=900000

# Audit log batch size (default: 10)
AUDIT_LOG_BATCH_SIZE=10

# Audit log flush interval in milliseconds (default: 5 seconds)
AUDIT_LOG_FLUSH_INTERVAL=5000

# =============================================================================
# HIPAA COMPLIANCE SETTINGS
# =============================================================================
# Enable HIPAA audit logging (default: true)
HIPAA_AUDIT_LOGGING_ENABLED=true

# Enable encryption of sensitive fields (default: true)
HIPAA_ENCRYPTION_ENABLED=true

# Data retention period in days (default: 2555 days = 7 years)
HIPAA_RETENTION_PERIOD_DAYS=2555

# Enable automatic data deletion after retention period (default: false)
HIPAA_AUTO_DELETION_ENABLED=false

# =============================================================================
# GDPR COMPLIANCE SETTINGS
# =============================================================================
# Enable GDPR data protection features (default: true)
GDPR_DATA_PROTECTION_ENABLED=true

# Enable IP address anonymization in audit logs (default: true)
GDPR_ANONYMIZE_IP_ADDRESSES=true

# Data subject access request email
GDPR_DSAR_EMAIL=privacy@yourorganization.com

# =============================================================================
# KEY MANAGEMENT SETTINGS
# =============================================================================
# Data encryption key rotation period in days (default: 90 days)
KEY_ROTATION_PERIOD_DAYS=90

# Organization key rotation period in days (default: 365 days)
ORG_KEY_ROTATION_PERIOD_DAYS=365

# Enable automatic key rotation (default: false - manual rotation recommended)
AUTO_KEY_ROTATION_ENABLED=false

# Key rotation notification email
KEY_ROTATION_NOTIFICATION_EMAIL=security@yourorganization.com

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
# Require business justification for PHI access (default: true)
REQUIRE_ACCESS_JUSTIFICATION=true

# Maximum failed access attempts before alert (default: 5)
MAX_FAILED_ACCESS_ATTEMPTS=5

# Enable security alerts (default: true)
SECURITY_ALERTS_ENABLED=true

# Security alert email
SECURITY_ALERT_EMAIL=security@yourorganization.com

# =============================================================================
# BACKUP AND RECOVERY
# =============================================================================
# Enable encrypted backups (default: true)
ENCRYPTED_BACKUPS_ENABLED=true

# Backup retention period in days (default: 30 days)
BACKUP_RETENTION_DAYS=30

# =============================================================================
# LOGGING
# =============================================================================
# Encryption audit log level (error, warn, info, debug)
ENCRYPTION_LOG_LEVEL=info

# Log file path for encryption events
ENCRYPTION_LOG_FILE=./logs/encryption-audit.log

# Enable console logging (default: false in production)
ENCRYPTION_CONSOLE_LOGGING=false
`;

    const envPath = path.join(process.cwd(), '.env.encryption');
    fs.writeFileSync(envPath, envTemplate);
    
    console.log(`${colors.green}${colors.bright}✓${colors.reset} Created ${colors.cyan}.env.encryption${colors.reset} file\n`);
    
    return envPath;
  }

  /**
   * Display key storage instructions
   */
  displayStorageInstructions() {
    console.log(`${colors.cyan}${colors.bright}\n📋 KEY STORAGE INSTRUCTIONS${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);

    console.log(`${colors.bright}1. MASTER ENCRYPTION KEY:${colors.reset}`);
    console.log(`   • Store in AWS KMS, Azure Key Vault, or HashiCorp Vault`);
    console.log(`   • Never store in plain text or version control`);
    console.log(`   • Limit access to security team only`);
    console.log(`   • Rotate annually or upon security incident\n`);

    console.log(`${colors.bright}2. LEGACY ENCRYPTION KEY:${colors.reset}`);
    console.log(`   • Store in secure parameter store (AWS SSM, Azure Key Vault)`);
    console.log(`   • Separate from master key storage`);
    console.log(`   • Required for backward compatibility\n`);

    console.log(`${colors.bright}3. BACKUP ENCRYPTION KEY:${colors.reset}`);
    console.log(`   • Store in separate secure location from production`);
    console.log(`   • Required for encrypted backup restoration`);
    console.log(`   • Test backup restoration quarterly\n`);

    console.log(`${colors.bright}4. EMERGENCY ACCESS KEY:${colors.reset}`);
    console.log(`   • Store offline in secure physical location`);
    console.log(`   • Seal in envelope with tamper-evident seal`);
    console.log(`   • Require dual control for access`);
    console.log(`   • Test emergency procedures annually\n`);

    console.log(`${colors.bright}5. TEST/DEMO KEY:${colors.reset}`);
    console.log(`   • Use only in development and testing environments`);
    console.log(`   • ${colors.red}NEVER use in production${colors.reset}`);
    console.log(`   • Can be stored less securely for development convenience\n`);
  }

  /**
   * Display next steps
   */
  displayNextSteps(envPath) {
    console.log(`${colors.cyan}${colors.bright}\n🚀 NEXT STEPS${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);

    console.log(`1. ${colors.bright}Secure the generated keys:${colors.reset}`);
    console.log(`   • Move ${colors.cyan}.env.encryption${colors.reset} to secure location`);
    console.log(`   • Copy keys to your secure vault (KMS, Key Vault, etc.)`);
    console.log(`   • Delete temporary key files\n`);

    console.log(`2. ${colors.bright}Update your environment:${colors.reset}`);
    console.log(`   • Copy relevant keys to your main ${colors.cyan}.env${colors.reset} file`);
    console.log(`   • Set up secure key management integration`);
    console.log(`   • Configure backup and monitoring\n`);

    console.log(`3. ${colors.bright}Run database migration:${colors.reset}`);
    console.log(`   • Execute: ${colors.yellow}psql -d your_db < migrations/001_create_encryption_infrastructure.sql${colors.reset}\n`);

    console.log(`4. ${colors.bright}Test encryption:${colors.reset}`);
    console.log(`   • Run encryption validation tests`);
    console.log(`   • Verify audit logging is working`);
    console.log(`   • Test key rotation procedures\n`);

    console.log(`5. ${colors.bright}Review compliance:${colors.reset}`);
    console.log(`   • Verify HIPAA compliance requirements`);
    console.log(`   • Verify GDPR compliance requirements`);
    console.log(`   • Update security policies and procedures\n`);

    console.log(`${colors.green}${colors.bright}✓${colors.reset} Key generation completed successfully!\n`);
  }

  /**
   * Prompt user for confirmation
   * @param {string} question - Question to ask
   * @returns {Promise<boolean>} User response
   */
  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log(`${colors.cyan}${colors.bright}\n🔐 HIPAA & GDPR Encryption Key Generator${colors.reset}\n`);
      
      // Warning about key security
      console.log(`${colors.red}${colors.bright}⚠️  IMPORTANT SECURITY WARNING ⚠️${colors.reset}`);
      console.log(`${colors.red}${'='.repeat(60)}${colors.reset}`);
      console.log(`${colors.red}The keys generated by this script must be kept secure!${colors.reset}`);
      console.log(`${colors.red}• Never commit keys to version control${colors.reset}`);
      console.log(`${colors.red}• Store in secure vault (KMS, Key Vault, etc.)${colors.reset}`);
      console.log(`${colors.red}• Limit access to authorized personnel only${colors.reset}`);
      console.log(`${colors.red}• Have incident response plan for key compromise${colors.reset}`);
      console.log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`);

      // Confirm generation
      const confirmed = await this.prompt(
        `${colors.bright}Do you want to generate new encryption keys? (y/n):${colors.reset} `
      );

      if (!confirmed) {
        console.log(`${colors.yellow}Key generation cancelled.${colors.reset}`);
        this.rl.close();
        return;
      }

      // Generate keys
      this.generateAllKeys();

      // Create .env file
      const envPath = this.createEnvFile();

      // Display storage instructions
      this.displayStorageInstructions();

      // Display next steps
      this.displayNextSteps(envPath);

      // Validate generated keys
      console.log(`${colors.cyan}${colors.bright}\n🔍 Validating Generated Keys${colors.reset}`);
      let allValid = true;
      
      for (const [keyName, keyValue] of Object.entries(this.keys)) {
        const isValid = this.validateKey(keyValue);
        const status = isValid ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        console.log(`  ${status} ${keyName}: ${isValid ? 'Valid' : 'Invalid'}`);
        allValid = allValid && isValid;
      }

      if (allValid) {
        console.log(`\n${colors.green}${colors.bright}✓${colors.reset} All keys are valid!\n`);
      } else {
        console.log(`\n${colors.red}${colors.bright}✗${colors.reset} Some keys are invalid! Please regenerate.\n`);
      }

      this.rl.close();

    } catch (error) {
      console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error.message);
      this.rl.close();
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new KeyGenerator();
  generator.run();
}

module.exports = KeyGenerator;