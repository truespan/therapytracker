const db = require('./src/config/database');

async function checkFailedReminders() {
  console.log('='.repeat(80));
  console.log('CHECKING FAILED REMINDER ATTEMPTS');
  console.log('='.repeat(80));
  console.log();

  try {
    // Check all reminder notifications (successful and failed)
    const allReminders = await db.query(`
      SELECT 
        wn.*,
        a.appointment_date,
        a.status as appointment_status,
        u.name as user_name,
        u.contact as user_contact
      FROM whatsapp_notifications wn
      LEFT JOIN appointments a ON wn.appointment_id = a.id
      LEFT JOIN users u ON wn.user_id = u.id
      WHERE wn.message_type = 'appointment_reminder'
      ORDER BY wn.created_at DESC
    `);

    console.log(`Total reminder notifications: ${allReminders.rows.length}`);
    console.log();

    if (allReminders.rows.length === 0) {
      console.log('⚠️  No reminder notifications found at all');
      console.log('   This means the cron job has never successfully processed any reminders,');
      console.log('   OR there were no appointments in the reminder window when it ran.');
    } else {
      const successful = allReminders.rows.filter(r => r.status === 'sent');
      const failed = allReminders.rows.filter(r => r.status === 'failed');
      
      console.log(`Successful: ${successful.length}`);
      console.log(`Failed: ${failed.length}`);
      console.log();

      if (failed.length > 0) {
        console.log('FAILED REMINDERS:');
        failed.forEach((notif, idx) => {
          console.log(`\n${idx + 1}. Notification ID: ${notif.id}`);
          console.log(`   Appointment ID: ${notif.appointment_id}`);
          console.log(`   User: ${notif.user_name} (${notif.user_contact})`);
          console.log(`   Created: ${notif.created_at}`);
          console.log(`   Error: ${notif.error_message || 'No error message'}`);
          if (notif.appointment_date) {
            const appointmentTime = new Date(notif.appointment_date);
            const createdTime = new Date(notif.created_at);
            const hoursUntil = (appointmentTime - createdTime) / (1000 * 60 * 60);
            console.log(`   Appointment was ${hoursUntil.toFixed(2)} hours away when reminder was attempted`);
          }
        });
      }

      if (successful.length > 0) {
        console.log('\nSUCCESSFUL REMINDERS:');
        successful.slice(0, 10).forEach((notif, idx) => {
          console.log(`${idx + 1}. Appointment ID: ${notif.appointment_id}, Created: ${notif.created_at}`);
        });
      }
    }

    // Check for appointments that should have gotten reminders but didn't
    console.log('\n' + '='.repeat(80));
    console.log('APPOINTMENTS THAT SHOULD HAVE GOTTEN REMINDERS');
    console.log('='.repeat(80));
    
    const missedReminders = await db.query(`
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
        END as reminder_sent,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM whatsapp_notifications wn
            WHERE wn.appointment_id = a.id
              AND wn.message_type = 'appointment_reminder'
          ) THEN true
          ELSE false
        END as reminder_attempted
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN partners p ON a.partner_id = p.id
      WHERE a.status = 'scheduled'
        AND a.appointment_date < NOW()
        AND a.appointment_date > NOW() - INTERVAL '7 days'
      ORDER BY a.appointment_date DESC
    `);

    console.log(`Past appointments in last 7 days: ${missedReminders.rows.length}`);
    
    if (missedReminders.rows.length > 0) {
      const withoutReminders = missedReminders.rows.filter(a => !a.reminder_sent);
      console.log(`Appointments without successful reminders: ${withoutReminders.length}`);
      
      withoutReminders.forEach((apt, idx) => {
        const appointmentTime = new Date(apt.appointment_date);
        const now = new Date();
        const hoursAgo = (now - appointmentTime) / (1000 * 60 * 60);
        
        console.log(`\n${idx + 1}. Appointment ID: ${apt.id}`);
        console.log(`   User: ${apt.user_name} (${apt.user_contact || 'No contact'})`);
        console.log(`   Appointment was: ${hoursAgo.toFixed(1)} hours ago`);
        console.log(`   Reminder attempted: ${apt.reminder_attempted ? '✅ Yes' : '❌ No'}`);
        console.log(`   Reminder sent: ${apt.reminder_sent ? '✅ Yes' : '❌ No'}`);
        
        if (!apt.reminder_attempted) {
          console.log(`   ⚠️  REMINDER WAS NEVER ATTEMPTED - Cron job may not have been running`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await db.end();
    process.exit(0);
  }
}

checkFailedReminders();

