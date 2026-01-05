/**
 * Run the disable therapist plan change migration
 * 
 * This script adds disable_therapist_plan_change column
 * to the organizations table.
 * 
 * Usage:
 *   node backend/database/scripts/run_disable_therapist_plan_change_migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  console.log('🚀 Running Disable Therapist Plan Change Migration...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationPath = path.join(__dirname, '../migration_add_disable_therapist_plan_change.sql');
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
    console.log(`✅ Completed: ${migrationName}\n`);

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name = 'disable_therapist_plan_change';
    `);

    if (result.rows.length === 1) {
      console.log('✅ Migration verified successfully!');
      console.log('Column added:');
      const row = result.rows[0];
      console.log(`   - ${row.column_name} (${row.data_type}, default: ${row.column_default})`);
    } else {
      console.warn('⚠️  Warning: Expected 1 column, found:', result.rows.length);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    
    // Check if column already exists (common error)
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log('\nℹ️  Note: Column may already exist. This is okay if you\'re re-running the migration.');
      
      // Try to verify if column exists
      try {
        const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'organizations' 
          AND column_name = 'disable_therapist_plan_change';
        `);
        if (checkResult.rows.length > 0) {
          console.log('✅ Column already exists in database:');
          checkResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}`);
          });
          console.log('\n✅ Migration already applied - nothing to do!');
        }
      } catch (checkError) {
        console.error('Error checking column:', checkError.message);
      }
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

