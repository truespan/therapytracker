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
    
    // Fetch recent settlements from Razorpay
    console.log('Fetching recent settlements from Razorpay...');
    const settlementsResponse = await RazorpayService.fetchSettlements({ count: 100 });
    const settlements = settlementsResponse.items || [];
    
    console.log(`Found ${settlements.length} recent settlements`);
    
    // Debug: Check settlement structure
    if (settlements.length > 0) {
      console.log('Sample settlement structure:', JSON.stringify(settlements[0], null, 2));
    }
    
    // Build payment ID -> settlement ID map
    // Razorpay settlements may need to be fetched individually to get payment IDs
    const paymentToSettlementMap = {};
    
    console.log('\nFetching detailed settlement information...');
    for (let i = 0; i < Math.min(settlements.length, 20); i++) {
      const settlement = settlements[i];
      try {
        // Fetch full settlement details to get payment IDs
        const settlementDetails = await RazorpayService.fetchSettlement(settlement.id);
        
        // Check various possible fields for payment IDs
        const paymentIds = settlementDetails.entity_ids || 
                          settlementDetails.payment_ids || 
                          (settlementDetails.items && settlementDetails.items.map(item => item.entity_id)) ||
                          [];
        
        if (paymentIds.length > 0) {
          console.log(`   Settlement ${settlement.id}: ${paymentIds.length} payments`);
          for (const paymentId of paymentIds) {
            paymentToSettlementMap[paymentId] = settlement.id;
          }
        }
      } catch (error) {
        console.error(`   Error fetching settlement ${settlement.id}:`, error.message);
      }
    }
    
    console.log(`\nSettlement map contains ${Object.keys(paymentToSettlementMap).length} payments\n`);
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
