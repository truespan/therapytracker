/**
 * Fix for timezone issue
 * The problem: PostgreSQL server is in Asia/Calcutta timezone
 * Even though we set session timezone to UTC, there's still conversion happening
 *
 * Solution: Change PostgreSQL server's default timezone to UTC permanently
 */

const db = require('./src/config/database');

async function fixTimezone() {
  try {
    console.log('\n=== Attempting PostgreSQL Server Timezone Fix ===\n');

    // Try to change the default timezone for the database
    console.log('1. Attempting to ALTER DATABASE timezone...');
    try {
      await db.query('ALTER DATABASE therapy_tracker SET timezone TO \'UTC\'');
      console.log('   ✅ Database default timezone set to UTC');
      console.log('   Note: You may need to reconnect for this to take full effect');
    } catch (err) {
      if (err.message.includes('permission denied')) {
        console.log('   ❌ Permission denied. You need superuser privileges.');
        console.log('   Run this SQL as postgres superuser:');
        console.log('   ALTER DATABASE therapy_tracker SET timezone TO \'UTC\';');
      } else {
        console.log('   ❌ Error:', err.message);
      }
    }

    // Check current state
    console.log('\n2. Current configuration:');
    const config = await db.query(`
      SELECT name, setting, source
      FROM pg_settings
      WHERE name IN ('TimeZone', 'log_timezone')
    `);
    config.rows.forEach(row => {
      console.log(`   ${row.name}: ${row.setting} (source: ${row.source})`);
    });

    console.log('\n3. Manual fix instructions:');
    console.log('   If the above ALTER DATABASE command failed, you need to:');
    console.log('   a) Open pgAdmin or connect as postgres superuser');
    console.log('   b) Run: ALTER DATABASE therapy_tracker SET timezone TO \'UTC\';');
    console.log('   c) Restart your PostgreSQL server');
    console.log('   d) Or edit postgresql.conf and set: timezone = \'UTC\'');

    console.log('\n=== Fix Complete ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

fixTimezone();
