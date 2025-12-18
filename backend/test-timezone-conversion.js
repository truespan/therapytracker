const db = require('./src/config/database');
const dateUtils = require('./src/utils/dateUtils');

async function testTimezoneConversion() {
  console.log('\n=== TIMEZONE CONVERSION TEST ===\n');

  try {
    // Check session timezone
    const tz = await db.query('SHOW timezone');
    console.log('1. Database session timezone:', tz.rows[0].TimeZone);

    // Test the dateUtils conversion
    console.log('\n2. Testing dateUtils.combineDateAndTime():');
    const testDate = '2025-12-18';
    const testTime = '23:30';
    const testTimezone = 'Asia/Kolkata';

    const result = dateUtils.combineDateAndTime(testDate, testTime, testTimezone);
    console.log(`   Input: ${testDate} ${testTime} (${testTimezone})`);
    console.log(`   Output (UTC Date): ${result}`);
    console.log(`   ISO String: ${result.toISOString()}`);
    console.log(`   Expected: 2025-12-18T18:00:00.000Z (23:30 IST - 5:30 offset)`);

    // Test inserting into database
    console.log('\n3. Testing database insertion:');
    const isoString = dateUtils.formatForPostgres(result);
    console.log(`   Formatted for Postgres: ${isoString}`);

    // Create a test slot
    const testInsert = await db.query(
      `INSERT INTO availability_slots
       (partner_id, slot_date, start_time, end_time, start_datetime, end_datetime, status, location_type, is_available)
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9)
       RETURNING id, start_datetime, end_datetime`,
      [1, testDate, testTime, '23:45', isoString, isoString, 'available_online', 'online', true]
    );

    console.log('\n4. Database returned:');
    console.log(`   start_datetime: ${testInsert.rows[0].start_datetime}`);
    console.log(`   ISO: ${testInsert.rows[0].start_datetime.toISOString()}`);

    // Query it back
    const testQuery = await db.query(
      'SELECT start_datetime, start_datetime::text as start_text FROM availability_slots WHERE id = $1',
      [testInsert.rows[0].id]
    );

    console.log('\n5. Query result:');
    console.log(`   start_datetime (JS Date): ${testQuery.rows[0].start_datetime}`);
    console.log(`   ISO: ${testQuery.rows[0].start_datetime.toISOString()}`);
    console.log(`   Text representation: ${testQuery.rows[0].start_text}`);

    // Clean up
    await db.query('DELETE FROM availability_slots WHERE id = $1', [testInsert.rows[0].id]);
    console.log('\n6. Test slot cleaned up.');

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log('\nConclusion:');
    console.log('  - If ISO string shows 18:00:00 UTC, conversion is CORRECT');
    console.log('  - If ISO string shows 23:30:00 UTC, conversion is WRONG');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

testTimezoneConversion();
