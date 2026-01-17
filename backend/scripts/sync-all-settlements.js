/**
 * Script to sync all settlements for all partners/organizations
 * Usage: node backend/scripts/sync-all-settlements.js
 */

const db = require('../src/config/database');
const Earnings = require('../src/models/Earnings');
const RazorpayService = require('../src/services/razorpayService');
const { getNextSaturday, formatDate } = require('../src/utils/dateUtils');
require('dotenv').config();

async function syncAllSettlements() {
  try {
    console.log('='.repeat(80));
    console.log('GLOBAL SETTLEMENT SYNC');
    console.log('='.repeat(80));
    console.log('');

    // Fetch all earnings candidates with pending earnings
    const candidates = await Earnings.getEarningsCandidates();
    const pendingCandidates = candidates.filter(c => parseFloat(c.pending_earnings) > 0);
    
    console.log(`Found ${pendingCandidates.length} recipients with pending earnings\n`);
    
    if (pendingCandidates.length === 0) {
      console.log('No pending earnings to sync.');
      return;
    }
    
    // Build payment ID -> settlement ID map by checking each pending payment
    // Razorpay doesn't provide payment IDs in settlement list, need to check payments individually
    const paymentToSettlementMap = {};
    
    console.log('Checking which payments have settlement IDs...\n');
    
    // Collect all pending payment IDs first
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
            recipient_type
          });
        }
      }
    }
    
    console.log(`Checking ${allPendingPayments.length} pending payments for settlement status...`);
    
    // Check each payment for settlement_id
    for (const item of allPendingPayments) {
      try {
        const payment = await RazorpayService.fetchPayment(item.payment_id);
        
        // Debug: Show payment structure for first payment
        if (allPendingPayments.indexOf(item) === 0) {
          console.log('Sample payment structure:', JSON.stringify(payment, null, 2));
        }
        
        // Check if payment has settlement_id
        if (payment.settlement_id) {
          paymentToSettlementMap[item.payment_id] = payment.settlement_id;
          console.log(`   ✓ Payment ${item.payment_id} → Settlement ${payment.settlement_id}`);
        } else {
          console.log(`   ✗ Payment ${item.payment_id} has no settlement_id (status: ${payment.status})`);
        }
      } catch (error) {
        console.error(`   ✗ Error checking payment ${item.payment_id}:`, error.message);
      }
    }
    
    console.log(`\nFound ${Object.keys(paymentToSettlementMap).length} payments with settlements\n`);
    console.log('='.repeat(80));
    
    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // Process each recipient
    for (let i = 0; i < pendingCandidates.length; i++) {
      const candidate = pendingCandidates[i];
      const { recipient_id, recipient_type, pending_earnings } = candidate;
      
      console.log(`\n[${i + 1}/${pendingCandidates.length}] Processing ${recipient_type} #${recipient_id} (Pending: ₹${parseFloat(pending_earnings).toFixed(2)})`);
      
      let recipientSynced = 0;
      let recipientSkipped = 0;
      
      try {
        // Get pending earnings for this recipient
        const pendingEarningsList = await Earnings.getEarnings(recipient_id, recipient_type, {
          status: 'pending'
        });
        
        console.log(`   Found ${pendingEarningsList.length} pending earnings records`);
        
        // Check each pending earning
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
    console.error('❌ Global sync failed:', error);
    throw error;
  }
}

// Run the sync
syncAllSettlements()
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
