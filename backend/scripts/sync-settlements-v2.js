/**
 * Settlement sync - Fetch all recent payments and check settlement_id
 * Since Razorpay doesn't provide a direct way to query payments by settlement,
 * we fetch recent payments and check each one individually
 */

const db = require('../src/config/database');
const Earnings = require('../src/models/Earnings');
const RazorpayService = require('../src/services/razorpayService');
const { getNextSaturday, formatDate } = require('../src/utils/dateUtils');
require('dotenv').config();

async function syncSettlements() {
  try {
    console.log('='.repeat(80));
    console.log('SETTLEMENT SYNC - V2 (BATCH PAYMENT CHECK)');
    console.log('='.repeat(80));
    console.log('');

    // Fetch all pending earnings
    const candidates = await Earnings.getEarningsCandidates();
    const pendingCandidates = candidates.filter(c => parseFloat(c.pending_earnings) > 0);

    console.log(`Found ${pendingCandidates.length} recipients with pending earnings\n`);

    if (pendingCandidates.length === 0) {
      console.log('No pending earnings to sync.');
      return;
    }

    // Collect all pending payment IDs
    const allPendingPayments = new Map(); // payment_id => earnings_info
    for (const candidate of pendingCandidates) {
      const { recipient_id, recipient_type } = candidate;
      const pendingEarningsList = await Earnings.getEarnings(recipient_id, recipient_type, {
        status: 'pending'
      });

      for (const earnings of pendingEarningsList) {
        if (earnings.razorpay_payment_id) {
          allPendingPayments.set(earnings.razorpay_payment_id, {
            earnings_id: earnings.id,
            recipient_id,
            recipient_type,
            amount: earnings.amount
          });
        }
      }
    }

    console.log(`Total pending payments to check: ${allPendingPayments.size}\n`);
    console.log('Checking each payment for settlement_id...\n');

    const paymentToSettlementMap = {};
    let checked = 0;
    let found = 0;

    // Check each pending payment individually for settlement_id
    for (const [paymentId, info] of allPendingPayments.entries()) {
      checked++;
      process.stdout.write(`\rChecking payment ${checked}/${allPendingPayments.size}...`);

      try {
        const payment = await RazorpayService.fetchPayment(paymentId);

        if (payment.settlement_id) {
          paymentToSettlementMap[paymentId] = payment.settlement_id;
          found++;
          console.log(`\n  ✅ Payment ${paymentId} → Settlement ${payment.settlement_id}`);
        }

        // Small delay to avoid rate limiting
        if (checked % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.log(`\n  ❌ Error checking payment ${paymentId}: ${error.message}`);
      }
    }

    console.log(`\n\nChecked ${checked} payments, found ${found} with settlement_id\n`);

    if (found === 0) {
      console.log('='.repeat(80));
      console.log('No pending payments have been settled yet.');
      console.log('Razorpay settlements typically occur T+3 business days after payment capture.');
      console.log('='.repeat(80));
      return;
    }

    // Update earnings with settlement info
    console.log('='.repeat(80));
    console.log('UPDATING EARNINGS RECORDS');
    console.log('='.repeat(80));
    console.log('');

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (let i = 0; i < pendingCandidates.length; i++) {
      const candidate = pendingCandidates[i];
      const { recipient_id, recipient_type, pending_earnings } = candidate;

      console.log(`\n[${i + 1}/${pendingCandidates.length}] Processing ${recipient_type} #${recipient_id} (Pending: ₹${parseFloat(pending_earnings).toFixed(2)})`);

      let recipientSynced = 0;
      let recipientSkipped = 0;

      try {
        const pendingEarningsList = await Earnings.getEarnings(recipient_id, recipient_type, {
          status: 'pending'
        });

        console.log(`   Found ${pendingEarningsList.length} pending earnings records`);

        for (const earnings of pendingEarningsList) {
          if (!earnings.razorpay_payment_id) {
            recipientSkipped++;
            continue;
          }

          const paymentId = earnings.razorpay_payment_id;
          const settlementId = paymentToSettlementMap[paymentId];

          if (settlementId) {
            // Payment is in a settlement - update to available
            const nextSaturday = getNextSaturday();
            const payoutDate = formatDate(nextSaturday);

            await Earnings.updateStatusByPaymentId(paymentId, 'available', payoutDate, settlementId);

            console.log(`   ✅ Synced: Earnings #${earnings.id} | Payment: ${paymentId} | Settlement: ${settlementId} | Amount: ₹${parseFloat(earnings.amount).toFixed(2)}`);
            recipientSynced++;
          } else {
            recipientSkipped++;
          }
        }

        console.log(`   Summary: ${recipientSynced} synced, ${recipientSkipped} skipped`);

        totalSynced += recipientSynced;
        totalSkipped += recipientSkipped;

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Synced: ${totalSynced}`);
    console.log(`Total Skipped: ${totalSkipped}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Recipients Processed: ${pendingCandidates.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Settlement sync failed:', error);
    throw error;
  }
}

// Run the sync
syncSettlements()
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
