/**
 * Manually run settlement sync immediately
 * This will catch up on all settled payments that haven't been synced yet
 */

const SettlementSyncService = require('../src/services/settlementSyncService');
const db = require('../src/config/database');
require('dotenv').config();

async function runSync() {
  try {
    console.log('='.repeat(80));
    console.log('MANUAL SETTLEMENT SYNC');
    console.log('='.repeat(80));
    console.log('');

    console.log('Starting settlement sync...');
    console.log('This will fetch recent settlements and update pending earnings.');
    console.log('');

    const result = await SettlementSyncService.syncAllSettlements({
      verbose: true,
      settlementCount: 100  // Check last 100 settlements
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log('Results:', JSON.stringify(result, null, 2));
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Sync failed:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Run the sync
runSync()
  .then(() => {
    console.log('\nSync completed successfully.');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSync failed:', error);
    db.end().finally(() => {
      process.exit(1);
    });
  });
