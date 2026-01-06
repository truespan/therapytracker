const cron = require('node-cron');
const Appointment = require('./src/models/Appointment');

console.log('Testing cron job schedule...');
console.log('Current time:', new Date().toISOString());
console.log();

// Test the query that finds appointments needing reminders
async function testQuery() {
  try {
    console.log('Testing findAppointmentsNeedingReminders query...');
    const appointments = await Appointment.findAppointmentsNeedingReminders();
    console.log(`Found ${appointments.length} appointment(s) needing reminders`);
    
    if (appointments.length > 0) {
      appointments.forEach((apt, idx) => {
        const appointmentTime = new Date(apt.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
        console.log(`\n${idx + 1}. Appointment ID: ${apt.id}`);
        console.log(`   User: ${apt.user_name} (${apt.user_contact})`);
        console.log(`   Appointment: ${appointmentTime.toISOString()}`);
        console.log(`   Hours until appointment: ${hoursUntil.toFixed(2)}`);
        console.log(`   Status: ${apt.status}`);
      });
    } else {
      console.log('No appointments in the reminder window (4-4.25 hours before)');
    }
  } catch (error) {
    console.error('Error testing query:', error);
  }
}

// Test cron schedule
console.log('Cron schedule: */10 * * * * (every 10 minutes)');
console.log('Next 5 execution times (UTC):');
const now = new Date();
for (let i = 0; i < 5; i++) {
  const next = new Date(now);
  next.setMinutes(Math.ceil(next.getMinutes() / 10) * 10 + i * 10);
  next.setSeconds(0);
  next.setMilliseconds(0);
  console.log(`  ${i + 1}. ${next.toISOString()}`);
}
console.log();

// Run the query test
testQuery().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('ISSUE ANALYSIS:');
  console.log('='.repeat(80));
  console.log();
  console.log('The cron job runs every 10 minutes at:');
  console.log('  :00, :10, :20, :30, :40, :50 (every hour)');
  console.log();
    console.log('The query looks for appointments that are:');
    console.log('  - Between 3 hours 50 minutes and 4 hours 20 minutes before appointment time');
    console.log('  - This is a 30-minute window (FIXED - was previously 10 minutes)');
    console.log();
    console.log('✅ FIX APPLIED:');
    console.log('  The query window has been expanded from 10 minutes to 30 minutes.');
    console.log('  This ensures appointments are caught even if they fall between cron runs.');
    console.log('  The window now covers: 3h50m to 4h20m before appointment time.');
  console.log();
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

