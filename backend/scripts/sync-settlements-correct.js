/**
 * Correct settlement sync script using Razorpay Settlements API
 * Razorpay Payments API doesn't include settlement_id, so we need to:
 * 1. Fetch settlements from Razorpay
 * 2. For each settlement, get the payments/demands in that settlement
 * 3. Update earnings records with settlement_id
 */

const db = require('../src/config/database');
const Earnings = require('../src/models/Earnings');
const RazorpayService = require('../src/services/razorpayService');
const { getNextSaturday, formatDate } = require('../src/utils/dateUtils');
require('dotenv').config();

async function syncSettlements() {
  try {
    console.log('='.repeat(80));
    console.log('SETTLEMENT SYNC - USING SETTLEMENTS API');
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
    const allPendingPayments = [];
    for (const candidate of pendingCandidates) {
      const { recipient_id, recipient_type } = candidate;
      const pendingEarningsList = await Earnings.getEarnings(recipient_id, recipient_type, {
        status: 'pending'
      });

      for (const earnings of pendingEarningsList) {
        if (earnings.razorpay_payment_id) {
          allPendingPayments.push({
            payment_id: earnings.razorpay_payment_id,
            earnings_id: earnings.id,
            recipient_id,
            recipient_type,
            amount: earnings.amount
          });
        }
      }
    }

    console.log(`Total pending payments to check: ${allPendingPayments.length}\n`);

    // Fetch settlements from Razorpay (get recent ones)
    console.log('Fetching settlements from Razorpay...\n');

    const paymentToSettlementMap = {};
    let totalSettlements = 0;
    let totalPaymentsFound = 0;

    // Fetch settlements in batches (Razorpay limits to 100 per request)
    // Fetch enough to cover recent payments (e.g., last 200 settlements)
    const batchSize = 100;
    const maxBatches = 2; // Fetch 200 settlements

    for (let batch = 0; batch < maxBatches; batch++) {
      const skip = batch * batchSize;
      console.log(`Fetching settlements batch ${batch + 1}/${maxBatches} (skip: ${skip}, count: ${batchSize})...`);

      try {
        const settlementsResponse = await RazorpayService.fetchSettlements({
          count: batchSize,
          skip: skip
        });

        const settlements = settlementsResponse.items || [];
        totalSettlements += settlements.length;

        console.log(`  Retrieved ${settlements.length} settlements`);

        if (settlements.length === 0) {
          console.log('  No more settlements found, stopping...');
          break;
        }

        // For each settlement, fetch its payments/demands
        for (const settlement of settlements) {
          const settlementId = settlement.id;
          const settlementStatus = settlement.status;
          const settlementAmount = settlement.amount / 100; // Convert paise to rupees
          const settlementDate = new Date(settlement.created_at * 1000).toISOString();

          console.log(`\n  Settlement: ${settlementId}`);
          console.log(`    Status: ${settlementStatus}`);
          console.log(`    Amount: ₹${settlementAmount.toFixed(2)}`);
          console.log(`    Date: ${settlementDate}`);

          // Only process processed/settled settlements
          if (settlementStatus !== 'processed' && settlementStatus !== 'settled') {
            console.log(`    ⏭️  Skipping - settlement not processed (status: ${settlementStatus})`);
            continue;
          }

          try {
            // Fetch payment demands for this settlement
            // Note: Razorpay settlements API returns "demands" which include payment details
            const demandsResponse = await RazorpayService.fetchSettlementPayments(settlementId);
            const demands = demandsResponse.items || [];

            console.log(`    Found ${demands.length} demands in this settlement`);

            // Extract payment IDs from demands
            for (const demand of demands) {
              // Demand structure includes entity details
              // For payments: demand.entity_id is the payment ID
              if (demand.type === 'payment' && demand.entity_id) {
                const paymentId = demand.entity_id;

                // Check if this payment is in our pending list
                const pendingPayment = allPendingPayments.find(p => p.payment_id === paymentId);

                if (pendingPayment) {
                  paymentToSettlementMap[paymentId] = settlementId;
                  totalPaymentsFound++;
                  console.log(`      ✅ Matched pending payment: ${paymentId} → Settlement: ${settlementId}`);
                }
              }
            }

          } catch (demandError) {
            console.error(`    ❌ Error fetching demands for settlement ${settlementId}:`, demandError.message);
          }
        }

        // Small delay between batches to avoid rate limiting
        if (batch < maxBatches - 1 && settlements.length === batchSize) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error fetching settlements batch ${batch + 1}:`, error.message);
        break;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Total settlements checked: ${totalSettlements}`);
    console.log(`Total pending payments matched to settlements: ${totalPaymentsFound}`);
    console.log('='.repeat(80));
    console.log('');

    if (totalPaymentsFound === 0) {
      console.log('No pending payments have been settled yet. They are still waiting for Razorpay to settle them.');
      console.log('Settlements typically happen T+3 days (3 business days after payment).');
      return;
    }

    // Update earnings with settlement info
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
