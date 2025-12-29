const cron = require('node-cron');
const VideoSession = require('../models/VideoSession');
const TherapySession = require('../models/TherapySession');

/**
 * Cron job to automatically mark expired sessions as completed
 * Runs every 5 minutes
 */
const scheduleExpiredSessionCompletion = () => {
  // Schedule: Run every 5 minutes
  // Format: minute hour day month weekday
  // '*/5 * * * *' = Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running expired session completion job...');

    try {
      // Mark expired video sessions as completed
      const videoCount = await VideoSession.markExpiredSessionsAsCompleted();
      console.log(`[Cron] Successfully marked ${videoCount} expired video session(s) as completed`);

      // Mark expired therapy sessions as completed
      const therapyCount = await TherapySession.markExpiredSessionsAsCompleted();
      console.log(`[Cron] Successfully marked ${therapyCount} expired therapy session(s) as completed`);

      if (videoCount > 0 || therapyCount > 0) {
        console.log(`[Cron] Total sessions marked as completed: ${videoCount + therapyCount}`);
      }
    } catch (error) {
      console.error('[Cron] Expired session completion job failed:', error.message);
      console.error('[Cron] Error details:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC" // Run in UTC timezone
  });

  console.log('[Cron] Expired session completion job scheduled: Every 5 minutes (UTC)');
};

module.exports = { scheduleExpiredSessionCompletion };

