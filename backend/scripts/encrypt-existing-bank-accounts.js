/**
 * Script to encrypt existing bank account data in the database
 * 
 * This script:
 * 1. Finds all partners and organizations with bank account data
 * 2. Checks if data is already encrypted
 * 3. Encrypts plain text data using AES-256-GCM
 * 4. Updates the database with encrypted values
 * 
 * Usage:
 *   node scripts/encrypt-existing-bank-accounts.js
 * 
 * Requirements:
 *   - ENCRYPTION_KEY must be set in environment
 *   - Database connection must be configured
 */

require('dotenv').config();
const db = require('../src/config/database');
const { encrypt, decrypt } = require('../src/services/encryptionService');

/**
 * Check if a string appears to be encrypted
 * Encrypted format: iv:salt:encrypted:authTag (4 parts separated by colons)
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  // Encrypted format has exactly 4 parts, all hex strings
  if (parts.length !== 4) return false;
  // Check if all parts are valid hex (basic check)
  return parts.every(part => /^[0-9a-f]+$/i.test(part) && part.length > 0);
}

/**
 * Encrypt bank account data for partners
 */
async function encryptPartnerBankAccounts() {
  try {
    console.log('Fetching partners with bank account data...');
    const query = `
      SELECT id, bank_account_holder_name, bank_account_number, 
             bank_ifsc_code, bank_name
      FROM partners
      WHERE bank_account_number IS NOT NULL 
         OR bank_account_holder_name IS NOT NULL
         OR bank_ifsc_code IS NOT NULL
    `;
    
    const result = await db.query(query);
    console.log(`Found ${result.rows.length} partners with bank account data`);
    
    let encrypted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const partner of result.rows) {
      try {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        let needsUpdate = false;
        
        // Check and encrypt bank_account_holder_name
        if (partner.bank_account_holder_name && !isEncrypted(partner.bank_account_holder_name)) {
          const encryptedValue = encrypt(partner.bank_account_holder_name);
          updates.push(`bank_account_holder_name = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_account_number
        if (partner.bank_account_number && !isEncrypted(partner.bank_account_number)) {
          const encryptedValue = encrypt(partner.bank_account_number);
          updates.push(`bank_account_number = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_ifsc_code
        if (partner.bank_ifsc_code && !isEncrypted(partner.bank_ifsc_code)) {
          const encryptedValue = encrypt(partner.bank_ifsc_code);
          updates.push(`bank_ifsc_code = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_name
        if (partner.bank_name && !isEncrypted(partner.bank_name)) {
          const encryptedValue = encrypt(partner.bank_name);
          updates.push(`bank_name = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          values.push(partner.id);
          const updateQuery = `
            UPDATE partners
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
          `;
          await db.query(updateQuery, values);
          encrypted++;
          console.log(`✓ Encrypted bank account data for partner ID ${partner.id}`);
        } else {
          skipped++;
          console.log(`- Skipped partner ID ${partner.id} (already encrypted or no data)`);
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error encrypting partner ID ${partner.id}:`, error.message);
      }
    }
    
    console.log(`\nPartners: ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
    return { encrypted, skipped, errors };
  } catch (error) {
    console.error('Error in encryptPartnerBankAccounts:', error);
    throw error;
  }
}

/**
 * Encrypt bank account data for organizations
 */
async function encryptOrganizationBankAccounts() {
  try {
    console.log('\nFetching organizations with bank account data...');
    const query = `
      SELECT id, bank_account_holder_name, bank_account_number, 
             bank_ifsc_code, bank_name
      FROM organizations
      WHERE bank_account_number IS NOT NULL 
         OR bank_account_holder_name IS NOT NULL
         OR bank_ifsc_code IS NOT NULL
    `;
    
    const result = await db.query(query);
    console.log(`Found ${result.rows.length} organizations with bank account data`);
    
    let encrypted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const org of result.rows) {
      try {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        let needsUpdate = false;
        
        // Check and encrypt bank_account_holder_name
        if (org.bank_account_holder_name && !isEncrypted(org.bank_account_holder_name)) {
          const encryptedValue = encrypt(org.bank_account_holder_name);
          updates.push(`bank_account_holder_name = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_account_number
        if (org.bank_account_number && !isEncrypted(org.bank_account_number)) {
          const encryptedValue = encrypt(org.bank_account_number);
          updates.push(`bank_account_number = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_ifsc_code
        if (org.bank_ifsc_code && !isEncrypted(org.bank_ifsc_code)) {
          const encryptedValue = encrypt(org.bank_ifsc_code);
          updates.push(`bank_ifsc_code = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        // Check and encrypt bank_name
        if (org.bank_name && !isEncrypted(org.bank_name)) {
          const encryptedValue = encrypt(org.bank_name);
          updates.push(`bank_name = $${paramIndex++}`);
          values.push(encryptedValue);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          values.push(org.id);
          const updateQuery = `
            UPDATE organizations
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
          `;
          await db.query(updateQuery, values);
          encrypted++;
          console.log(`✓ Encrypted bank account data for organization ID ${org.id}`);
        } else {
          skipped++;
          console.log(`- Skipped organization ID ${org.id} (already encrypted or no data)`);
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error encrypting organization ID ${org.id}:`, error.message);
      }
    }
    
    console.log(`\nOrganizations: ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
    return { encrypted, skipped, errors };
  } catch (error) {
    console.error('Error in encryptOrganizationBankAccounts:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Bank Account Data Encryption Script');
    console.log('='.repeat(60));
    console.log('');
    
    // Verify encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    
    if (process.env.ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    
    console.log('✓ Encryption key found');
    console.log('');
    
    // Encrypt partner bank accounts
    const partnerResults = await encryptPartnerBankAccounts();
    
    // Encrypt organization bank accounts
    const orgResults = await encryptOrganizationBankAccounts();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Encryption Summary');
    console.log('='.repeat(60));
    console.log(`Partners:      ${partnerResults.encrypted} encrypted, ${partnerResults.skipped} skipped, ${partnerResults.errors} errors`);
    console.log(`Organizations: ${orgResults.encrypted} encrypted, ${orgResults.skipped} skipped, ${orgResults.errors} errors`);
    console.log(`Total:         ${partnerResults.encrypted + orgResults.encrypted} records encrypted`);
    console.log('='.repeat(60));
    
    if (partnerResults.errors === 0 && orgResults.errors === 0) {
      console.log('\n✓ All bank account data encrypted successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠ Some errors occurred during encryption. Please review the output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection pool
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  encryptPartnerBankAccounts,
  encryptOrganizationBankAccounts,
  isEncrypted
};

