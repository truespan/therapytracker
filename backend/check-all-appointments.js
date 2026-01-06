const db = require('./src/config/database');

async function checkAllAppointments() {
  console.log('='.repeat(80));
  console.log('CHECKING ALL APPOINTMENTS IN DATABASE');
  console.log('='.repeat(80));
  console.log();

  try {
    // Check all appointments
    const allAppointments = await db.query(`
      SELECT 
        a.*,
        u.name as user_name,
        u.contact as user_contact,
        p.name as partner_name,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM whatsapp_notifications wn
            WHERE wn.appointment_id = a.id
              AND wn.message_type = 'appointment_reminder'
              AND wn.status = 'sent'
          ) THEN true
          ELSE false
        END as reminder_sent
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN partners p ON a.partner_id = p.id
      ORDER BY a.appointment_date DESC
      LIMIT 50
    `);

    console.log(`Total appointments found: ${allAppointments.rows.length}`);
    console.log();

    if (allAppointments.rows.length === 0) {
      console.log('⚠️  No appointments found in database');
      console.log('   This explains why no reminders are being sent.');
    } else {
      console.log('Recent appointments:');
      allAppointments.rows.forEach((apt, idx) => {
        const appointmentTime = apt.appointment_date ? new Date(apt.appointment_date) : null;
        const now = new Date();
        let timeInfo = 'N/A';
        if (appointmentTime) {
          const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
          const daysUntil = hoursUntil / 24;
          if (hoursUntil < 0) {
            timeInfo = `${Math.abs(hoursUntil).toFixed(1)} hours ago (PAST)`;
          } else if (hoursUntil < 24) {
            timeInfo = `${hoursUntil.toFixed(1)} hours from now`;
          } else {
            timeInfo = `${daysUntil.toFixed(1)} days from now`;
          }
        }
        
        console.log(`\n${idx + 1}. Appointment ID: ${apt.id}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   User: ${apt.user_name || 'N/A'} (${apt.user_contact || 'No contact'})`);
        console.log(`   Partner: ${apt.partner_name || 'N/A'}`);
        console.log(`   Date/Time: ${apt.appointment_date ? new Date(apt.appointment_date).toISOString() : 'N/A'}`);
        console.log(`   Time from now: ${timeInfo}`);
        console.log(`   Reminder Sent: ${apt.reminder_sent ? '✅' : '❌'}`);
        
        // Check if it's in the reminder window
        if (appointmentTime && apt.status === 'scheduled') {
          const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
          if (hoursUntil <= 4.25 && hoursUntil >= 4) {
            console.log(`   ⚠️  SHOULD GET REMINDER NOW (within 4-4.25 hour window)`);
          } else if (hoursUntil > 4.25 && hoursUntil < 24) {
            console.log(`   ⏳ Will get reminder in ${(hoursUntil - 4).toFixed(1)} hours`);
          } else if (hoursUntil < 4 && hoursUntil > 0) {
            console.log(`   ⚠️  MISSED REMINDER WINDOW (less than 4 hours away)`);
          }
        }
      });
    }

    // Check database timezone
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE TIMEZONE CHECK');
    console.log('='.repeat(80));
    const timezoneCheck = await db.query("SELECT NOW() as db_time, CURRENT_TIMESTAMP as current_ts, timezone('UTC', NOW()) as utc_time");
    console.log('Database NOW():', timezoneCheck.rows[0].db_time);
    console.log('Current Timestamp:', timezoneCheck.rows[0].current_ts);
    console.log('UTC Time:', timezoneCheck.rows[0].utc_time);
    console.log('Server Time:', new Date().toISOString());

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await db.end();
    process.exit(0);
  }
}

checkAllAppointments();

