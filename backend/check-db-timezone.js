const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTimezone() {
  console.log('=== DATABASE TIMEZONE CHECK ===\n');

  try {
    // Check timezone setting
    const tz = await pool.query('SHOW timezone');
    console.log('Database Timezone:', tz.rows[0].TimeZone);

    // Check current time
    const now = await pool.query("SELECT NOW() as local_time, NOW() AT TIME ZONE 'UTC' as utc_time");
    console.log('\nCurrent Times:');
    console.log('  Local (DB TZ):', now.rows[0].local_time);
    console.log('  UTC:', now.rows[0].utc_time);

    // Check a sample availability slot
    const slot = await pool.query(`
      SELECT
        slot_date,
        start_time,
        end_time,
        start_datetime,
        start_datetime::text as start_datetime_text,
        timezone('UTC', start_datetime) as start_utc,
        timezone('Asia/Kolkata', start_datetime) as start_ist
      FROM availability_slots
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (slot.rows.length > 0) {
      console.log('\nMost Recent Availability Slot:');
      console.log('  slot_date:', slot.rows[0].slot_date);
      console.log('  start_time:', slot.rows[0].start_time);
      console.log('  start_datetime (JS Date):', slot.rows[0].start_datetime);
      console.log('  start_datetime (text):', slot.rows[0].start_datetime_text);
      console.log('  start_datetime in UTC:', slot.rows[0].start_utc);
      console.log('  start_datetime in IST:', slot.rows[0].start_ist);
    } else {
      console.log('\nNo slots found in database');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTimezone();
