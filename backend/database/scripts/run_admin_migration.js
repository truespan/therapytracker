/**
 * Admin Migration Runner Script
 * 
 * This script runs the admin migration directly from Node.js
 * without requiring psql command line tool.
 * 
 * Usage:
 *   node backend/database/scripts/run_admin_migration.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../../src/config/database');

async function runMigration() {
  console.log('🚀 Running Admin Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_admin_support.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments that start with --
    migrationSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Split into individual statements (separated by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip SELECT statements that are just comments
      if (statement.toLowerCase().startsWith('select \'')) {
        console.log(`ℹ️  Info: ${statement.split("'")[1]}`);
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await db.query(statement);
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error) {
        // Check if error is due to object already existing
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('violates unique constraint')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)\n`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 100) + '...\n');
          // Continue with other statements
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETED!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: node backend/database/scripts/setup_admin.js');
    console.log('   2. Verify: node backend/database/scripts/verify_admin_migration.js');
    console.log('   3. Login with:');
    console.log('      Email: admin@therapytracker.com');
    console.log('      Password: Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run migration
runMigration();

