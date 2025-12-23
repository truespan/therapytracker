#!/usr/bin/env node

const db = require('./src/config/database');

async function verifyMigration() {
  console.log('Verifying Google OAuth Migration...\n');
  
  try {
    // Check if columns exist
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'auth_credentials'
      AND column_name IN ('google_id', 'is_google_user', 'password_hash')
    `);
    
    console.log('Found columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    if (result.rows.length === 0) {
      console.log('\nMigration not applied. Running migration now...');
      
      // Run migration
      await db.query(`
        ALTER TABLE auth_credentials
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_google_user BOOLEAN DEFAULT FALSE
      `);
      
      await db.query(`
        ALTER TABLE auth_credentials
        ALTER COLUMN password_hash DROP NOT NULL
      `);
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_auth_credentials_google_id
        ON auth_credentials(google_id)
        WHERE google_id IS NOT NULL
      `);
      
      console.log('\nMigration applied successfully!');
    } else {
      console.log('\nMigration already applied.');
    }
    
    // Verify constraints
    const constraintResult = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'auth_credentials'
      AND constraint_type = 'UNIQUE'
    `);
    
    const hasUniqueConstraint = constraintResult.rows.some(row =>
      row.constraint_name === 'auth_credentials_google_id_unique'
    );
    
    if (!hasUniqueConstraint) {
      console.log('Adding unique constraint...');
      await db.query(`
        ALTER TABLE auth_credentials
        ADD CONSTRAINT auth_credentials_google_id_unique
        UNIQUE (google_id)
      `).catch(err => {
        if (err.message.includes('already exists')) {
          console.log('  (already exists)');
        } else {
          throw err;
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

verifyMigration();