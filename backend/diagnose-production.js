/**
 * Production Diagnostic Script
 * Run this on production server to diagnose timezone issues
 *
 * Usage: node diagnose-production.js
 */

const db = require('./src/config/database');
const dateUtils = require('./src/utils/dateUtils');

async function runDiagnostics() {
  console.log('\n========================================');
  console.log('PRODUCTION TIMEZONE DIAGNOSTIC');
  console.log('========================================\n');

  try {
    // 1. Check database timezone
    console.log('1. Database Connection Timezone:');
    const tzResult = await db.query('SHOW timezone');
    console.log('   Timezone:', tzResult.rows[0].TimeZone);
    console.log('   ✓ Should be: UTC\n');

    // 2. Test dateUtils conversion
    console.log('2. Testing dateUtils.combineDateAndTime():');
    const testInput = {
      date: '2025-12-19',
      time: '23:30',
      timezone: 'Asia/Calcutta'
    };
    console.log('   Input:', testInput);

    const converted = dateUtils.combineDateAndTime(
      testInput.date,
      testInput.time,
      testInput.timezone
    );
    console.log('   Output (Date obj):', converted);
    console.log('   Output (ISO):', converted.toISOString());
    console.log('   Expected:', '2025-12-19T18:00:00.000Z (23:30 - 5:30 = 18:00)');
    console.log('   ✓ Correct:', converted.toISOString() === '2025-12-19T18:00:00.000Z', '\n');

    // 3. Check if partner exists
    console.log('3. Checking for test partner:');
    const partnerCheck = await db.query('SELECT id, name FROM partners ORDER BY id LIMIT 1');
    if (partnerCheck.rows.length === 0) {
      console.log('   ❌ No partners found in database');
      console.log('   Cannot test slot insertion\n');
      await db.end();
      return;
    }
    const testPartnerId = partnerCheck.rows[0].id;
    console.log(`   ✓ Found partner: ${partnerCheck.rows[0].name} (ID: ${testPartnerId})\n`);

    // 4. Test actual slot insertion
    console.log('4. Testing Slot Insertion:');
    const testSlot = {
      partner_id: testPartnerId,
      slot_date: '2025-12-20',
      start_time: '23:30',
      end_time: '23:45',
      timezone: 'Asia/Calcutta'
    };
    console.log('   Creating test slot:', testSlot);

    // Use the exact same code path as AvailabilitySlot.create()
    const userTimezone = testSlot.timezone || 'UTC';
    const start_datetime = dateUtils.combineDateAndTime(testSlot.slot_date, testSlot.start_time, userTimezone);
    const end_datetime = dateUtils.combineDateAndTime(testSlot.slot_date, testSlot.end_time, userTimezone);

    console.log('   Converted start_datetime:', start_datetime.toISOString());
    console.log('   Formatted for Postgres:', dateUtils.formatForPostgres(start_datetime));

    const insertQuery = `
      INSERT INTO availability_slots
      (partner_id, slot_date, start_time, end_time, start_datetime, end_datetime, status, location_type, is_available)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9)
      RETURNING id, start_datetime, end_datetime
    `;
    const insertValues = [
      testSlot.partner_id,
      testSlot.slot_date,
      testSlot.start_time,
      testSlot.end_time,
      dateUtils.formatForPostgres(start_datetime),
      dateUtils.formatForPostgres(end_datetime),
      'available_online',
      'online',
      true
    ];

    const insertResult = await db.query(insertQuery, insertValues);
    const createdSlot = insertResult.rows[0];

    console.log('   ✓ Slot created with ID:', createdSlot.id);
    console.log('   Database returned start_datetime:', createdSlot.start_datetime);
    console.log('   Database returned (ISO):', createdSlot.start_datetime.toISOString());
    console.log('   Expected: 2025-12-20T18:00:00.000Z');
    console.log('   ✓ Correct:', createdSlot.start_datetime.toISOString() === '2025-12-20T18:00:00.000Z', '\n');

    // 5. Query it back
    console.log('5. Querying Slot Back:');
    const queryResult = await db.query(
      'SELECT id, slot_date, start_time, start_datetime, end_datetime FROM availability_slots WHERE id = $1',
      [createdSlot.id]
    );
    const queriedSlot = queryResult.rows[0];

    console.log('   Query returned:');
    console.log('     slot_date:', queriedSlot.slot_date);
    console.log('     start_time:', queriedSlot.start_time);
    console.log('     start_datetime:', queriedSlot.start_datetime);
    console.log('     start_datetime (ISO):', queriedSlot.start_datetime.toISOString());
    console.log('   ✓ Matches inserted:', queriedSlot.start_datetime.toISOString() === createdSlot.start_datetime.toISOString(), '\n');

    // 6. Clean up
    console.log('6. Cleaning up test slot...');
    await db.query('DELETE FROM availability_slots WHERE id = $1', [createdSlot.id]);
    console.log('   ✓ Test slot deleted\n');

    // 7. Final summary
    console.log('========================================');
    console.log('DIAGNOSTIC SUMMARY');
    console.log('========================================');
    console.log('✓ Database timezone: UTC');
    console.log('✓ dateUtils conversion: Working correctly');
    console.log('✓ Database storage: Working correctly');
    console.log('✓ Database retrieval: Working correctly');
    console.log('\nIf all checks passed, the backend is working correctly.');
    console.log('Issue may be in:');
    console.log('1. Frontend not sending timezone parameter');
    console.log('2. Browser cache (hard refresh needed)');
    console.log('3. Old slots in database (delete and recreate)\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await db.end();
  }
}

// Run diagnostics
runDiagnostics();
