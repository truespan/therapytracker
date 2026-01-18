/**
 * One-time backfill script to reconcile historical pending earnings
 * Fetches settlement recon data for the last 3 months and updates all pending earnings
 *
 * This script should be run once in production after deploying the new settlement sync fixes
 * to catch up on all pending earnings that were already settled but not synced due to
 * the previous broken API implementation
 */

const SettlementSyncService = require('../src/services/settlementSyncService');
const db = require('../src/config/database');
require('dotenv').config();

async function reconcileHistoricalSettlements() {
  try {
    console.log('='.repeat(80));
    console.log('HISTORICAL SETTLEMENT RECONCILIATION');
    console.log('='.repeat(80));
    console.log('');
    console.log('This will reconcile ALL pending earnings with Razorpay settlements');
    console.log('Checking last 3 months of settlement data...');
    console.log('');

    const startTime = Date.now();

    // Run the sync with extended time range (3 months instead of default 2)
    // This ensures we catch any older pending earnings that might have been missed
    const result = await SettlementSyncService.syncAllSettlements({
      verbose: true,
      monthsToCheck: 3  // Check last 3 months
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(80));
    console.log('RECONCILIATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Duration: ${duration} seconds`);
    console.log('');
    console.log('Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80));

    // Show summary per recipient
    if (result.recipients && result.recipients.length > 0) {
      console.log('');
      console.log('SUMMARY BY RECIPIENT:');
      console.log('-'.repeat(80));

      result.recipients.forEach(r => {
        if (r.synced > 0) {
          console.log(`  ${r.recipient_type.padEnd(12)} #${String(r.recipient_id).padStart(5)}: ${r.synced} earnings synced (${r.pending_count} pending)`);
        }
      });

      console.log('-'.repeat(80));
      console.log(`Total: ${result.total_synced} earnings synced across ${result.recipients_processed} recipients`);
      console.log('');
    }

    // Show overall statistics
    console.log('');
    console.log('OVERALL STATISTICS:');
    console.log('-'.repeat(80));
    console.log(`✅ Synced:  ${result.total_synced}`);
    console.log(`⏭️  Skipped: ${result.total_skipped}`);
    console.log(`❌ Errors:  ${result.total_errors}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ RECONCILIATION FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(80));
    throw error;
  }
}

// Run the reconciliation
reconcileHistoricalSettlements()
  .then(() => {
    console.log('');
    console.log('✅ Historical reconciliation completed successfully.');
    console.log('');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Reconciliation failed:', error.message);
    console.error('');
    db.end().finally(() => {
      process.exit(1);
    });
  });
