const cron = require('node-cron');
const AvailabilitySlot = require('../models/AvailabilitySlot');

/**
 * Cron job to automatically archive availability slots older than 7 days
 * Runs daily at midnight (00:00)
 */
const scheduleSlotArchival = () => {
  // Schedule: Run every day at midnight
  // Format: minute hour day month weekday
  // '0 0 * * *' = At 00:00 (midnight) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running slot archival job...');

    try {
      const count = await AvailabilitySlot.archiveOldSlots();
      console.log(`[Cron] Successfully archived ${count} old availability slot(s)`);
    } catch (error) {
      console.error('[Cron] Slot archival job failed:', error.message);
      console.error('[Cron] Error details:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC" // Run in UTC timezone
  });

  console.log('[Cron] Slot archival job scheduled: Daily at midnight (UTC)');
};

module.exports = { scheduleSlotArchival };
