const cron = require('node-cron');
const SettlementSyncService = require('../services/settlementSyncService');
const db = require('../config/database');

/**
 * Settlement Sync Cron Job
 * 
 * This cron job runs periodically to sync settlements as a safety net
 * in case webhooks are missed or delayed. It complements the webhook-driven
 * approach to ensure eventual consistency.
 * 
 * Schedule: Every 6 hours (at 00:00, 06:00, 12:00, 18:00)
 * 
 * This provides a good balance between:
 * - Catching missed webhooks in a reasonable timeframe
 * - Not overloading the Razorpay API with too many requests
 * - Ensuring therapists see updated balances within a day
 */

let cronJob = null;

/**
 * Start the settlement sync cron job
 */
function startSettlementSyncCron() {
  // Run every 6 hours at the top of the hour
  // Cron format: minute hour day month weekday
  // '0 */6 * * *' means: at minute 0 of every 6th hour
  cronJob = cron.schedule('0 */6 * * *', async () => {
    console.log('='.repeat(80));
    console.log('[CRON] Settlement Sync Job Started');
    console.log(`[CRON] Time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
    
    try {
      const result = await SettlementSyncService.syncAllSettlements({ verbose: true });
      
      console.log('='.repeat(80));
      console.log('[CRON] Settlement Sync Job Completed Successfully');
      console.log(`[CRON] Results:`, {
        total_synced: result.total_synced,
        total_skipped: result.total_skipped,
        total_errors: result.total_errors,
        recipients_processed: result.recipients_processed
      });
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('='.repeat(80));
      console.error('[CRON] Settlement Sync Job Failed');
      console.error('[CRON] Error:', error.message);
      console.error('[CRON] Stack:', error.stack);
      console.error('='.repeat(80));
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian Standard Time
  });
  
  console.log('[CRON] Settlement sync cron job started - runs every 6 hours');
  console.log('[CRON] Next run times (IST):');
  console.log('[CRON]   - 00:00 (midnight)');
  console.log('[CRON]   - 06:00 (morning)');
  console.log('[CRON]   - 12:00 (noon)');
  console.log('[CRON]   - 18:00 (evening)');
}

/**
 * Stop the settlement sync cron job
 */
function stopSettlementSyncCron() {
  if (cronJob) {
    cronJob.stop();
    console.log('[CRON] Settlement sync cron job stopped');
  }
}

/**
 * Run settlement sync immediately (for testing or manual trigger)
 */
async function runSettlementSyncNow() {
  console.log('[CRON] Running settlement sync manually...');
  
  try {
    const result = await SettlementSyncService.syncAllSettlements({ verbose: true });
    console.log('[CRON] Manual sync completed:', result);
    return result;
  } catch (error) {
    console.error('[CRON] Manual sync failed:', error);
    throw error;
  }
}

module.exports = {
  startSettlementSyncCron,
  stopSettlementSyncCron,
  runSettlementSyncNow
};
