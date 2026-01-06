const db = require('./src/config/database');
const Appointment = require('./src/models/Appointment');
const Partner = require('./src/models/Partner');
const Organization = require('./src/models/Organization');
const SubscriptionPlan = require('./src/models/SubscriptionPlan');
const PartnerSubscription = require('./src/models/PartnerSubscription');

async function checkReminderLogs() {
  console.log('='.repeat(80));
  console.log('WHATSAPP REMINDER DIAGNOSTIC CHECK');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Check recent WhatsApp notifications for reminders
    console.log('1. Checking recent WhatsApp reminder notifications...');
    const notificationQuery = `
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
      LIMIT 20
    `;
    const notifications = await db.query(notificationQuery);
    
    if (notifications.rows.length === 0) {
      console.log('   ⚠️  No reminder notifications found in database');
    } else {
      console.log(`   Found ${notifications.rows.length} recent reminder notifications:`);
      notifications.rows.forEach((notif, idx) => {
        console.log(`   ${idx + 1}. Appointment ID: ${notif.appointment_id}, Status: ${notif.status}, Created: ${notif.created_at}`);
        if (notif.error_message) {
          console.log(`      Error: ${notif.error_message}`);
        }
        if (notif.appointment_date) {
          const appointmentTime = new Date(notif.appointment_date);
          const now = new Date();
          const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
          console.log(`      Appointment: ${appointmentTime.toISOString()} (${hoursUntil.toFixed(2)} hours from now)`);
        }
      });
    }
    console.log();

    // 2. Check appointments that should be getting reminders
    console.log('2. Checking appointments that should receive reminders...');
    const appointments = await Appointment.findAppointmentsNeedingReminders();
    
    if (appointments.length === 0) {
      console.log('   ℹ️  No appointments currently need reminders (within 4-4.25 hour window)');
    } else {
      console.log(`   Found ${appointments.length} appointment(s) needing reminders:`);
      for (const apt of appointments) {
        const appointmentTime = new Date(apt.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
        
        console.log(`   - Appointment ID: ${apt.id}`);
        console.log(`     User: ${apt.user_name} (${apt.user_contact})`);
        console.log(`     Partner: ${apt.partner_name}`);
        console.log(`     Date/Time: ${appointmentTime.toISOString()} (${hoursUntil.toFixed(2)} hours from now)`);
        console.log(`     Status: ${apt.status}`);
        
        // Check subscription
        const subscription = await PartnerSubscription.getActiveSubscription(apt.partner_id);
        let partnerHasWhatsApp = false;
        if (subscription) {
          const plan = await SubscriptionPlan.findById(subscription.subscription_plan_id);
          partnerHasWhatsApp = plan && plan.has_whatsapp === true;
          console.log(`     Partner WhatsApp Access: ${partnerHasWhatsApp ? '✅' : '❌'} (Plan: ${plan?.name || 'N/A'})`);
        } else {
          console.log(`     Partner WhatsApp Access: ❌ (No active subscription)`);
        }
        
        // Check organization subscription
        const partner = await Partner.findById(apt.partner_id);
        let organizationHasWhatsApp = true;
        if (partner && partner.organization_id) {
          const orgSubscription = await Organization.getActiveSubscription(partner.organization_id);
          if (orgSubscription && orgSubscription.subscription_plan_id) {
            const orgPlan = await SubscriptionPlan.findById(orgSubscription.subscription_plan_id);
            organizationHasWhatsApp = orgPlan && orgPlan.has_whatsapp === true;
            console.log(`     Organization WhatsApp Access: ${organizationHasWhatsApp ? '✅' : '❌'} (Plan: ${orgPlan?.name || 'N/A'})`);
          } else {
            organizationHasWhatsApp = false;
            console.log(`     Organization WhatsApp Access: ❌ (No active subscription)`);
          }
        }
        
        console.log();
      }
    }
    console.log();

    // 3. Check upcoming appointments (next 24 hours)
    console.log('3. Checking upcoming appointments in next 24 hours...');
    const upcomingQuery = `
      SELECT 
        a.*,
        u.name as user_name,
        u.contact as user_contact,
        p.name as partner_name,
        p.id as partner_id,
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
      JOIN users u ON a.user_id = u.id
      JOIN partners p ON a.partner_id = p.id
      WHERE a.status = 'scheduled'
        AND a.appointment_date > NOW()
        AND a.appointment_date <= NOW() + INTERVAL '24 hours'
      ORDER BY a.appointment_date ASC
    `;
    const upcoming = await db.query(upcomingQuery);
    
    if (upcoming.rows.length === 0) {
      console.log('   ℹ️  No upcoming appointments in next 24 hours');
    } else {
      console.log(`   Found ${upcoming.rows.length} upcoming appointment(s):`);
      upcoming.rows.forEach((apt, idx) => {
        const appointmentTime = new Date(apt.appointment_date);
        const now = new Date();
        const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
        const shouldHaveReminder = hoursUntil <= 4.25 && hoursUntil >= 4;
        
        console.log(`   ${idx + 1}. Appointment ID: ${apt.id}`);
        console.log(`      User: ${apt.user_name} (${apt.user_contact || 'No contact'})`);
        console.log(`      Time: ${appointmentTime.toISOString()} (${hoursUntil.toFixed(2)} hours from now)`);
        console.log(`      Reminder Sent: ${apt.reminder_sent ? '✅' : '❌'}`);
        console.log(`      Should Get Reminder Now: ${shouldHaveReminder ? '✅ YES' : '❌ NO (too early/late)'}`);
        console.log();
      });
    }
    console.log();

    // 4. Check WhatsApp service configuration
    console.log('4. Checking WhatsApp service configuration...');
    const whatsappService = require('./src/services/whatsappService');
    console.log(`   WhatsApp Enabled: ${whatsappService.enabled ? '✅' : '❌'}`);
    console.log(`   From Number: ${whatsappService.fromNumber || 'Not set'}`);
    console.log(`   Use Templates: ${whatsappService.useTemplates ? '✅' : '❌'}`);
    if (whatsappService.useTemplates) {
      console.log(`   Reminder Template: ${whatsappService.templateNames?.appointmentReminder || 'Not set'}`);
      console.log(`   Template Locale: ${whatsappService.templateLocale || 'Not set'}`);
    }
    console.log(`   Queue Length: ${whatsappService.messageQueue?.length || 0}`);
    console.log(`   Processing Queue: ${whatsappService.isProcessingQueue ? 'Yes' : 'No'}`);
    console.log();

    // 5. Check cron job status (we can't directly check, but we can see if reminders were sent recently)
    console.log('5. Cron Job Status Check...');
    const recentReminders = await db.query(`
      SELECT COUNT(*) as count
      FROM whatsapp_notifications
      WHERE message_type = 'appointment_reminder'
        AND created_at > NOW() - INTERVAL '1 hour'
    `);
    const count = parseInt(recentReminders.rows[0].count);
    console.log(`   Reminders sent in last hour: ${count}`);
    if (count === 0) {
      console.log('   ⚠️  No reminders sent in the last hour - cron job may not be running');
    } else {
      console.log('   ✅ Cron job appears to be active');
    }
    console.log();

    console.log('='.repeat(80));
    console.log('DIAGNOSTIC CHECK COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error during diagnostic check:', error);
    console.error(error.stack);
  } finally {
    await db.end();
    process.exit(0);
  }
}

checkReminderLogs();

