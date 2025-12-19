/**
 * Test script to diagnose timezone issues in appointment creation
 * Run with: node test-appointment-timezone.js
 */

const db = require('./src/config/database');

async function testTimezoneHandling() {
  console.log('\n=== Appointment Timezone Test ===\n');

  try {
    // Test 1: Check database timezone setting
    console.log('1. Checking database timezone...');
    const timezoneResult = await db.query('SHOW timezone');
    console.log('   Database timezone:', timezoneResult.rows[0].TimeZone);

    // Test 2: Check current time in different formats
    console.log('\n2. Checking current time representation...');
    const timeTest = await db.query(`
      SELECT
        NOW() as db_now,
        CURRENT_TIMESTAMP as current_timestamp,
        NOW() AT TIME ZONE 'UTC' as now_utc,
        NOW() AT TIME ZONE 'Asia/Kolkata' as now_kolkata
    `);
    console.log('   Database NOW():', timeTest.rows[0].db_now);
    console.log('   CURRENT_TIMESTAMP:', timeTest.rows[0].current_timestamp);
    console.log('   NOW() AT TIME ZONE UTC:', timeTest.rows[0].now_utc);
    console.log('   NOW() AT TIME ZONE Asia/Kolkata:', timeTest.rows[0].now_kolkata);

    // Test 3: Insert a test appointment with known time
    console.log('\n3. Testing appointment insertion...');

    // Simulate what the frontend sends: 2024-12-19 14:30 in Kolkata
    // After conversion, should be 2024-12-19 09:00 UTC
    const testISOString = '2024-12-19T09:00:00.000Z'; // This is what frontend should send (already UTC)

    console.log('   Test ISO string (UTC):', testISOString);

    const insertResult = await db.query(`
      INSERT INTO appointments (
        partner_id, user_id, title, appointment_date, end_date,
        duration_minutes, notes, timezone
      )
      VALUES (
        (SELECT id FROM partners LIMIT 1),
        (SELECT id FROM users LIMIT 1),
        'Timezone Test Appointment',
        $1::timestamptz,
        ($1::timestamptz + interval '60 minutes'),
        60,
        'Testing timezone handling - entered as 14:30 IST, should be 09:00 UTC',
        'Asia/Kolkata'
      )
      RETURNING
        id,
        appointment_date,
        appointment_date AT TIME ZONE 'UTC' as appointment_date_utc,
        appointment_date AT TIME ZONE 'Asia/Kolkata' as appointment_date_kolkata,
        timezone
    `, [testISOString]);

    const inserted = insertResult.rows[0];
    console.log('\n   Inserted appointment:');
    console.log('   - ID:', inserted.id);
    console.log('   - appointment_date (as stored):', inserted.appointment_date);
    console.log('   - appointment_date AT TIME ZONE UTC:', inserted.appointment_date_utc);
    console.log('   - appointment_date AT TIME ZONE Asia/Kolkata:', inserted.appointment_date_kolkata);
    console.log('   - timezone field:', inserted.timezone);

    // Test 4: Read it back
    console.log('\n4. Reading appointment back...');
    const selectResult = await db.query(`
      SELECT
        id,
        appointment_date,
        appointment_date AT TIME ZONE 'UTC' as appointment_date_utc,
        appointment_date AT TIME ZONE 'Asia/Kolkata' as appointment_date_kolkata,
        timezone
      FROM appointments
      WHERE id = $1
    `, [inserted.id]);

    const selected = selectResult.rows[0];
    console.log('   - appointment_date (as retrieved):', selected.appointment_date);
    console.log('   - appointment_date AT TIME ZONE UTC:', selected.appointment_date_utc);
    console.log('   - appointment_date AT TIME ZONE Asia/Kolkata:', selected.appointment_date_kolkata);

    // Test 5: Check what the API would return
    console.log('\n5. Simulating API response...');
    console.log('   If returned as-is, JavaScript would interpret as:');
    const jsDate = new Date(selected.appointment_date);
    console.log('   - new Date(appointment_date):', jsDate.toISOString());
    console.log('   - In Kolkata:', jsDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('   - In UTC:', jsDate.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Cleanup
    console.log('\n6. Cleaning up test appointment...');
    await db.query('DELETE FROM appointments WHERE id = $1', [inserted.id]);
    console.log('   Test appointment deleted.');

    console.log('\n=== Test Complete ===\n');
    console.log('EXPECTED BEHAVIOR:');
    console.log('- User enters: 2024-12-19 14:30 (Kolkata time)');
    console.log('- Frontend converts to: 2024-12-19T09:00:00.000Z (UTC)');
    console.log('- Database stores: 2024-12-19 09:00:00+00 (UTC)');
    console.log('- When displayed in Kolkata: 2024-12-19 14:30');
    console.log('\nIf times are different, there is a conversion error.');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error('Error details:', error.message);
  } finally {
    await db.end();
  }
}

testTimezoneHandling();
