const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const whatsappService = require('../services/whatsappService');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PartnerSubscription = require('../models/PartnerSubscription');

/**
 * Cron job to send appointment reminders 4 hours before appointment time
 * Runs every 10 minutes to check for appointments needing reminders
 * Query window: 3 hours 50 minutes to 4 hours 20 minutes (30-minute window)
 */
const scheduleAppointmentReminders = () => {
  // Schedule: Run every 10 minutes
  // Format: minute hour day month weekday
  // '*/10 * * * *' = Every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Running appointment reminder job...');

    try {
      // Find appointments that need reminders (4 hours before)
      const appointments = await Appointment.findAppointmentsNeedingReminders();
      
      if (appointments.length === 0) {
        console.log('[Cron] No appointments need reminders at this time');
        return;
      }

      console.log(`[Cron] Found ${appointments.length} appointment(s) needing reminders`);

      let sentCount = 0;
      let failedCount = 0;

      for (const appointment of appointments) {
        try {
          // Check if partner has WhatsApp access
          const subscription = await PartnerSubscription.getActiveSubscription(appointment.partner_id);
          let partnerHasWhatsApp = false;
          
          if (subscription) {
            const plan = await SubscriptionPlan.findById(subscription.subscription_plan_id);
            partnerHasWhatsApp = plan && plan.has_whatsapp === true;
          }

          if (!partnerHasWhatsApp) {
            console.log(`[Cron] WhatsApp not enabled for partner ${appointment.partner_id} - skipping reminder`);
            continue;
          }

          // Check if organization has WhatsApp access (if partner belongs to an organization)
          let organizationHasWhatsApp = true;
          const partner = await Partner.findById(appointment.partner_id);
          if (partner && partner.organization_id) {
            const orgSubscription = await Organization.getActiveSubscription(partner.organization_id);
            if (orgSubscription && orgSubscription.subscription_plan_id) {
              const orgPlan = await SubscriptionPlan.findById(orgSubscription.subscription_plan_id);
              organizationHasWhatsApp = orgPlan && orgPlan.has_whatsapp === true;
            } else {
              organizationHasWhatsApp = false;
            }
          }

          if (!organizationHasWhatsApp) {
            console.log(`[Cron] WhatsApp not enabled for organization ${partner?.organization_id} - skipping reminder`);
            continue;
          }

          // Send reminder to client
          if (appointment.user_contact) {
            const appointmentData = {
              userName: appointment.user_name,
              therapistName: appointment.partner_name,
              appointmentDate: appointment.appointment_date,
              appointmentTime: new Date(appointment.appointment_date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: appointment.timezone || 'Asia/Kolkata'
              }),
              timezone: appointment.timezone || 'IST',
              appointmentType: appointment.title,
              duration: appointment.duration_minutes || 60
            };

            const result = await whatsappService.sendAppointmentReminder(
              appointment.user_contact,
              appointmentData,
              appointment.id,
              appointment.user_id
            );

            if (result.success) {
              sentCount++;
              console.log(`[Cron] Reminder sent successfully for appointment ${appointment.id}`);
            } else {
              failedCount++;
              console.error(`[Cron] Failed to send reminder for appointment ${appointment.id}:`, result.error);
            }
          } else {
            console.log(`[Cron] No phone number found for user ${appointment.user_id} - skipping reminder`);
            failedCount++;
          }
        } catch (error) {
          failedCount++;
          console.error(`[Cron] Error processing reminder for appointment ${appointment.id}:`, error.message);
        }
      }

      console.log(`[Cron] Reminder job completed: ${sentCount} sent, ${failedCount} failed`);
    } catch (error) {
      console.error('[Cron] Appointment reminder job failed:', error.message);
      console.error('[Cron] Error details:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC" // Run in UTC timezone
  });

  console.log('[Cron] Appointment reminder job scheduled: Every 10 minutes (UTC)');
};

module.exports = { scheduleAppointmentReminders };

