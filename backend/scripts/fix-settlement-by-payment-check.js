/**
 * Fix settlement sync by checking settlements and their payment IDs
 * This script fetches settlements from Razorpay and checks which pending payments
 * are included in those settlements, since payment details don't contain settlement_id
 *
 * Usage: node backend/scripts/fix-settlement-by-payment-check.js
 */

require('dotenv').config();
const db = require('../src/config/database');
const RazorpayService = require('../src/services/razorpayService');
const Earnings = require('../src/models/Earnings');
const { getNextSaturday, formatDate } = require('../src/utils/dateUtils');

async function fixSettlementByPaymentCheck() {
  try {
    console.log('='.repeat(80));
    console.log('FIX SETTLEMENT SYNC BY CHECKING SETTLEMENTS');
    console.log('='.repeat(80));
    console.log();

    // Get all pending earnings
    const query = `
      SELECT
        e.id, e.recipient_id, e.recipient_type, e.razorpay_payment_id,
        e.amount, e.created_at
      FROM earnings e
      WHERE e.status = 'pending'
        AND e.razorpay_payment_id IS NOT NULL
      ORDER BY e.created_at DESC
    `;
    
    const result = await db.query(query);
    const pendingEarnings = result.rows;
    
    console.log(`Found ${pendingEarnings.length} pending earnings with payment IDs\n`);
    
    if (pendingEarnings.length === 0) {
      console.log('✅ No pending earnings to process');
      return;
    }
    
    // Create a map of payment IDs to earnings for quick lookup
    const paymentIdToEarning = {};
    pendingEarnings.forEach(earning => {
      paymentIdToEarning[earning.razorpay_payment_id] = earning;
    });
    
    console.log('Fetching settlements from Razorpay...\n');
    
    let syncedCount = 0;
    let notSettledCount = 0;
    let errorCount = 0;
    
    try {
      // Fetch settlements from Razorpay (fetch more to cover older payments)
      const settlementsResponse = await RazorpayService.fetchSettlements({ count: 100 });
      const settlements = settlementsResponse.items || [];
      
      console.log(`Found ${settlements.length} settlements from Razorpay\n`);
      
      if (settlements.length === 0) {
        console.log('⚠️  No settlements found in Razorpay');
        console.log('   All pending payments remain unsettled');
        notSettledCount = pendingEarnings.length;
      } else {
        // Build payment ID to settlement ID map from settlements
        const paymentToSettlementMap = {};
        
        console.log('Processing settlements and extracting payment IDs...\n');
        
        for (const settlement of settlements) {
          console.log(`Settlement ${settlement.id}:`);
          console.log(`  Amount: ₹${(settlement.amount / 100).toFixed(2)}`);
          console.log(`  Status: ${settlement.status}`);
          console.log(`  Created: ${new Date(settlement.created_at * 1000).toISOString()}`);
          
          // Check if settlement has entity_ids (payment IDs)
          if (settlement.entity_ids && Array.isArray(settlement.entity_ids)) {
            const paymentIds = settlement.entity_ids.filter(id => id && id.startsWith('pay_'));
            console.log(`  Payment IDs: ${paymentIds.length} found`);
            
            // Map each payment ID to this settlement
            paymentIds.forEach(paymentId => {
              paymentToSettlementMap[paymentId] = settlement.id;
            });
          } else {
            console.log(`  Payment IDs: None (entity_ids empty or missing)`);
          }
          console.log();
        }
        
        console.log(`Total unique payment IDs in settlements: ${Object.keys(paymentToSettlementMap).length}\n`);
        console.log('='.repeat(80));
        console.log('MATCHING PENDING EARNINGS WITH SETTLEMENTS');
        console.log('='.repeat(80));
        console.log();
        
        // Now check each pending earning against the settlement map
        for (const earning of pendingEarnings) {
          const paymentId = earning.razorpay_payment_id;
          const settlementId = paymentToSettlementMap[paymentId];
          
          console.log(`Checking payment ${paymentId}...`);
          
          if (settlementId) {
            // Payment has been settled!
            const nextSaturday = getNextSaturday();
            const payoutDate = formatDate(nextSaturday);
            
            try {
              // Update earnings to available
              await Earnings.updateStatusByPaymentId(
                paymentId,
                'available',
                payoutDate,
                settlementId
              );
              
              console.log(`  ✅ UPDATED: Earning #${earning.id} → 'available' (Settlement: ${settlementId})`);
              console.log(`     Recipient: ${earning.recipient_type}#${earning.recipient_id}`);
              console.log(`     Amount: ₹${parseFloat(earning.amount).toFixed(2)}`);
              console.log(`     Payout Date: ${payoutDate}`);
              syncedCount++;
            } catch (error) {
              console.error(`  ❌ ERROR: Failed to update earning #${earning.id}:`, error.message);
              errorCount++;
            }
          } else {
            console.log(`  ⏳ NOT SETTLED: Payment not found in any settlement`);
            notSettledCount++;
          }
          
          console.log();
        }
      }
    } catch (error) {
      console.error('❌ ERROR: Failed to fetch settlements from Razorpay:', error.message);
      console.error(error.stack);
      errorCount++;
      notSettledCount = pendingEarnings.length;
    }
    
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total pending earnings checked: ${pendingEarnings.length}`);
    console.log(`✅ Synced to 'available': ${syncedCount}`);
    console.log(`⏳ Not yet settled: ${notSettledCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log();
    
    if (syncedCount > 0) {
      console.log('✅ SUCCESS: Settlement sync completed!');
      console.log('   Available balances have been updated for affected recipients.');
    } else if (notSettledCount > 0) {
      console.log('⏳ INFO: All pending payments are not yet settled by Razorpay.');
      console.log('   This is normal if payments were captured recently.');
      console.log('   Razorpay typically settles payments in 2-3 business days.');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
  } finally {
    await db.end();
  }
}

fixSettlementByPaymentCheck()
  .then(() => {
    console.log('\nScript completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
