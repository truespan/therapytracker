/**
 * Run the partner management features migration
 * This adds the missing columns: verification_token, verification_token_expires, email_verified, is_active, etc.
 * 
 * Usage:
 *   node run_partner_migration.js
 * 
 * Or from backend directory:
 *   node database/scripts/run_partner_migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  console.error('Please make sure you have a .env file with DATABASE_URL set');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationPath = path.join(__dirname, '../migrations/add_partner_management_features.sql');
    const migrationName = path.basename(migrationPath);

    console.log(`📄 Running migration: ${migrationName}`);

    // Check if file exists
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(sql);
    console.log(`✅ Migration completed successfully: ${migrationName}\n`);

    // Verify the columns were added
    console.log('🔍 Verifying columns were added...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'partners'
        AND column_name IN ('verification_token', 'verification_token_expires', 'email_verified', 'is_active', 'deactivated_at', 'deactivated_by')
      ORDER BY column_name;
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Verified columns in partners table:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n⚠️  Warning: Could not verify columns were added');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now create partners without errors.');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
console.log('🚀 Starting partner management features migration...\n');
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



















