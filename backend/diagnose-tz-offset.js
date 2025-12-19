const db = require('./src/config/database');

async function diagnose() {
  try {
    console.log('\n=== Timezone Offset Diagnosis ===\n');

    const result = await db.query(`
      SELECT
        current_setting('TIMEZONE') as session_tz,
        EXTRACT(TIMEZONE FROM NOW()) as session_tz_offset_seconds,
        EXTRACT(TIMEZONE FROM NOW()) / 3600 as session_tz_offset_hours,
        NOW() as now_with_tz,
        NOW()::timestamp as now_without_tz,
        '2024-12-19T09:00:00.000Z'::text as input_iso_string,
        '2024-12-19T09:00:00.000Z'::timestamptz as interpreted_value,
        pg_typeof('2024-12-19T09:00:00.000Z'::timestamptz) as value_type
    `);

    console.log('Session Timezone:', result.rows[0].session_tz);
    console.log('Session TZ Offset (seconds):', result.rows[0].session_tz_offset_seconds);
    console.log('Session TZ Offset (hours):', result.rows[0].session_tz_offset_hours);
    console.log('\nNOW() with TZ:', result.rows[0].now_with_tz);
    console.log('NOW() without TZ:', result.rows[0].now_without_tz);
    console.log('\nInput ISO string:', result.rows[0].input_iso_string);
    console.log('Interpreted as timestamptz:', result.rows[0].interpreted_value);
    console.log('Data type:', result.rows[0].value_type);

    console.log('\n=== Diagnosis Complete ===\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

diagnose();
