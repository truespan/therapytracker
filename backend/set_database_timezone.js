const { Pool } = require('pg');
require('dotenv').config();

/**
 * Script to set PostgreSQL database timezone to UTC
 * This sets the timezone at the database level, not just per session
 */

async function setDatabaseTimezone() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL not found in environment variables');
    console.error('Please ensure your .env file contains DATABASE_URL');
    process.exit(1);
  }

  // Extract database name from connection string
  const dbMatch = connectionString.match(/\/\/([^:]+):([^@]+)@([^:]+:(\d+))?\/?([^?]+)/);
  if (!dbMatch) {
    console.error('❌ Error: Could not parse DATABASE_URL');
    process.exit(1);
  }
  
  const databaseName = dbMatch[5] || 'therapy_tracker';
  
  // Connect to postgres database first (to change timezone on target database)
  const postgresUrl = connectionString.replace(/\/[^\/]+(\?|$)/, '/postgres$1');
  const pool = new Pool({
    connectionString: postgresUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check current timezone
    console.log('🔍 Checking current database timezone...');
    const currentTzResult = await client.query(
      `SELECT current_setting('timezone') as timezone`
    );
    console.log(`Current session timezone: ${currentTzResult.rows[0].timezone}\n`);

    // Get database timezone setting
    const dbTzResult = await client.query(
      `SELECT d.datname, pg_catalog.pg_encoding_to_char(d.encoding) as encoding,
              d.datcollate, d.datctype, d.datistemplate, d.datallowconn,
              (SELECT setting FROM pg_settings WHERE name = 'timezone') as server_timezone
       FROM pg_catalog.pg_database d
       WHERE d.datname = $1`,
      [databaseName]
    );

    if (dbTzResult.rows.length === 0) {
      console.error(`❌ Error: Database '${databaseName}' not found`);
      process.exit(1);
    }

    console.log(`📊 Database: ${databaseName}`);
    console.log(`Server timezone setting: ${dbTzResult.rows[0].server_timezone}\n`);

    // Set timezone for the specific database
    console.log(`🔧 Setting timezone to UTC for database '${databaseName}'...`);
    await client.query(`ALTER DATABASE ${databaseName} SET timezone = 'UTC'`);
    console.log('✅ Database timezone set to UTC\n');

    // Verify the setting
    console.log('🔍 Verifying timezone setting...');
    const verifyResult = await client.query(
      `SELECT name, setting, source 
       FROM pg_settings 
       WHERE name = 'timezone' 
       AND context = 'user'`
    );
    
    if (verifyResult.rows.length > 0) {
      console.log(`✅ Verified: timezone = ${verifyResult.rows[0].setting}`);
      console.log(`   Source: ${verifyResult.rows[0].source}\n`);
    }

    // Test with a new connection to the target database
    console.log('🧪 Testing with connection to target database...');
    client.release();
    
    const targetPool = new Pool({
      connectionString: connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const testClient = await targetPool.connect();
    const testResult = await testClient.query(`SELECT current_setting('timezone') as timezone`);
    console.log(`✅ New connection timezone: ${testResult.rows[0].timezone}\n`);
    
    testClient.release();
    await targetPool.end();

    console.log('🎉 Database timezone successfully set to UTC!');
    console.log('\n📝 Note: This setting will apply to all new connections to this database.');
    console.log('   Existing connections may need to reconnect to pick up the change.\n');

  } catch (error) {
    console.error('\n❌ Error setting database timezone:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
console.log('🚀 Setting database timezone to UTC...\n');
setDatabaseTimezone().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});





