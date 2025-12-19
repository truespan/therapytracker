/**
 * Test availability slot booking timezone handling
 */

require('dotenv').config();
const db = require('./src/config/database');
const AvailabilitySlot = require('./src/models/AvailabilitySlot');
const Appointment = require('./src/models/Appointment');

async function testAvailabilityBooking() {
  try {
    console.log('\n=== Availability Slot Booking Timezone Test ===\n');

    // Get a test partner
    const partnerResult = await db.query('SELECT id FROM partners LIMIT 1');
    if (!partnerResult.rows[0]) {
      console.error('No partners found in database');
      return;
    }
    const partnerId = partnerResult.rows[0].id;

    // Create a test availability slot
    // User creates slot at 14:30 IST (which is 09:00 UTC)
    console.log('1. Creating availability slot...');
    console.log('   User timezone: Asia/Kolkata');
    console.log('   User enters: 2024-12-20 14:30 IST');
    console.log('   Expected UTC: 2024-12-20 09:00 UTC');

    const slot = await AvailabilitySlot.create({
      partner_id: partnerId,
      slot_date: '2024-12-20',
      start_time: '14:30',
      end_time: '15:30',
      status: 'available_online',
      timezone: 'Asia/Kolkata'
    });

    console.log('\n   Slot created with ID:', slot.id);
    console.log('   start_datetime (stored):', slot.start_datetime);
    console.log('   Expected: 2024-12-20T09:00:00.000Z');
    console.log('   Match:', slot.start_datetime.toISOString() === '2024-12-20T09:00:00.000Z' ? '✅' : '❌');

    // Now simulate booking this slot
    console.log('\n2. Retrieving slot for booking...');
    const retrievedSlot = await AvailabilitySlot.findById(slot.id);
    console.log('   start_datetime (retrieved):', retrievedSlot.start_datetime);

    // Simulate what bookSlot does
    console.log('\n3. Creating appointment from slot (like bookSlot does)...');
    const startDatetime = new Date(retrievedSlot.start_datetime);
    const endDatetime = new Date(retrievedSlot.end_datetime);

    console.log('   Start datetime object:', startDatetime);
    console.log('   Start datetime ISO:', startDatetime.toISOString());
    console.log('   Expected: 2024-12-20T09:00:00.000Z');
    console.log('   Match:', startDatetime.toISOString() === '2024-12-20T09:00:00.000Z' ? '✅' : '❌');

    // Get a test user
    const userResult = await db.query('SELECT id FROM users LIMIT 1');
    if (!userResult.rows[0]) {
      console.error('No users found in database');
      return;
    }
    const userId = userResult.rows[0].id;

    const dateUtils = require('./src/utils/dateUtils');
    const durationMinutes = dateUtils.differenceInMinutes(endDatetime, startDatetime);

    const appointment = await Appointment.create({
      partner_id: partnerId,
      user_id: userId,
      title: 'Test Booking',
      appointment_date: startDatetime.toISOString(),
      end_date: endDatetime.toISOString(),
      duration_minutes: durationMinutes,
      notes: 'Test appointment from availability slot',
      timezone: 'UTC'
    });

    console.log('\n4. Appointment created...');
    console.log('   Appointment ID:', appointment.id);
    console.log('   appointment_date (stored):', appointment.appointment_date);
    console.log('   Expected: 2024-12-20T09:00:00.000Z');
    console.log('   Match:', appointment.appointment_date.toISOString() === '2024-12-20T09:00:00.000Z' ? '✅' : '❌');

    // Cleanup
    console.log('\n5. Cleaning up...');
    await Appointment.delete(appointment.id);
    await AvailabilitySlot.delete(slot.id);
    console.log('   Test data deleted.');

    console.log('\n=== Test Complete ===\n');
    console.log('RESULT:');
    const success = startDatetime.toISOString() === '2024-12-20T09:00:00.000Z' &&
                    appointment.appointment_date.toISOString() === '2024-12-20T09:00:00.000Z';
    if (success) {
      console.log('✅ SUCCESS: Availability slot booking correctly handles timezones!');
    } else {
      console.log('❌ FAILURE: Timezone conversion is still incorrect.');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.end();
  }
}

testAvailabilityBooking();
