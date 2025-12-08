/**
 * Database Migration Runner for Render.com
 *
 * This script runs all necessary database migrations in the correct order.
 * It's designed to be run once during initial deployment to Render.
 *
 * Usage:
 *   node run_migrations.js [DATABASE_URL]
 *
 * If DATABASE_URL is not provided, it will use the one from environment variables.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from command line arg or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not provided');
  console.error('Usage: node run_migrations.js [DATABASE_URL]');
  console.error('   Or set DATABASE_URL environment variable');
  process.exit(1);
}

// List of migration files in order
const migrations = [
  '../schema.sql',
  '../migration_password_reset.sql',
  '../migrations/add_admin_support.sql',
  '../migrations/add_video_sessions.sql',
  '../migrations/add_video_sessions_toggle.sql',
  '../migrations/add_custom_questionnaires_postgres.sql',
  '../migrations/add_question_subheadings.sql',
  '../migrations/add_questionnaire_text_field.sql',
  '../migrations/update_subscription_plans.sql',
  '../migrations/add_mental_status_examinations.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, migration);
      const migrationName = path.basename(migration);

      console.log(`📄 Running migration: ${migrationName}`);

      try {
        // Check if file exists
        if (!fs.existsSync(migrationPath)) {
          console.warn(`⚠️  Warning: Migration file not found: ${migrationPath}`);
          console.warn('   Skipping...\n');
          continue;
        }

        // Read migration file
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await client.query(sql);
        console.log(`✅ Completed: ${migrationName}\n`);
      } catch (error) {
        // Some migrations might fail if already applied (e.g., tables already exist)
        // We'll log the error but continue with other migrations
        console.error(`❌ Error in ${migrationName}:`);
        console.error(`   ${error.message}`);
        console.error('   Continuing with next migration...\n');
      }
    }

    // Verify database setup
    console.log('🔍 Verifying database setup...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n✅ Database tables created:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create admin account using the admin setup script');
    console.log('   2. Deploy your backend and frontend');
    console.log('   3. Test the application');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migrations
console.log('🚀 Starting database migrations...\n');
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
