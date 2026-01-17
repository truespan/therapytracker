/**
 * Diagnostic script to check settlement synchronization status
 * This script helps identify if settlements are being properly captured
 * and if available balances are being updated correctly
 * 
 * Usage: node backend/scripts/check-settlement-sync.js [partner_id|organization_id]
 */

require('dotenv').config();
const db = require('../src/config/database');
const RazorpayService = require('../src/services/razorpayService');
const Earnings = require('../src/models/Earnings');

async function checkSettlementSync(recipientId = null) {
  try {
    console.log('='.repeat(80));
    console.log('SETTLEMENT SYNCHRONIZATION DIAGNOSTIC');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Check pending earnings
    let pendingQuery = `
      SELECT 
        e.id, e.recipient_id, e.recipient_type, e.razorpay_payment_id,
        e.razorpay_settlement_id, e.amount, e.status, e.created_at
      FROM earnings e
      WHERE e.status = 'pending'
    `;
    
    const queryParams = [];
    if (recipientId) {
      pendingQuery += ` AND (e.recipient_id = $1)`;
      queryParams.push(recipientId);
    }
    
    pendingQuery += ` ORDER BY e.created_at DESC LIMIT 50`;
    
    const pendingResult = await db.query(pendingQuery, queryParams);
    const pendingEarnings = pendingResult.rows;
    
    console.log(`📊 PENDING EARNINGS: ${pendingEarnings.length} records`);
    console.log('-'.repeat(80));
    
    if (pendingEarnings.length === 0) {
      console.log('✅ No pending earnings found. All earnings are settled or available.');
    } else {
      console.log('⚠️  Found pending earnings that may need settlement sync:\n');
      
      // Group by recipient
      const byRecipient = {};
      pendingEarnings.forEach(e => {
        const key = `${e.recipient_type}#${e.recipient_id}`;
        if (!byRecipient[key]) {
          byRecipient[key] = { earnings: [], total: 0 };
        }
        byRecipient[key].earnings.push(e);
        byRecipient[key].total += parseFloat(e.amount);
      });
      
      for (const [recipientKey, data] of Object.entries(byRecipient)) {
        console.log(`   ${recipientKey}: ${data.earnings.length} pending earnings, Total: ₹${data.total.toFixed(2)}`);
        data.earnings.slice(0, 3).forEach(e => {
          console.log(`      - Payment ID: ${e.razorpay_payment_id} | Amount: ₹${parseFloat(e.amount).toFixed(2)} | Created: ${e.created_at}`);
        });
        if (data.earnings.length > 3) {
          console.log(`      ... and ${data.earnings.length - 3} more`);
        }
      }
    }
    
    console.log();
    console.log('='.repeat(80));
    
    // Step 2: Check Razorpay settlements
    console.log('🔍 CHECKING RAZORPAY SETTLEMENTS');
    console.log('-'.repeat(80));
    
    try {
      const settlementsResponse = await RazorpayService.fetchSettlements({ count: 20 });
      const settlements = settlementsResponse.items || [];
      
      console.log(`Found ${settlements.length} recent settlements from Razorpay\n`);
      
      if (settlements.length === 0) {
        console.log('⚠️  No settlements found in Razorpay. This could mean:');
        console.log('   - No payments have been settled yet');
        console.log('   - Razorpay API credentials may be incorrect');
        console.log('   - Settlement cycle has not completed');
      } else {
        // Build payment ID to settlement ID map
        const paymentToSettlementMap = {};
        const settlementDetails = [];
        
        for (const settlement of settlements.slice(0, 10)) {
          const details = {
            id: settlement.id,
            amount: settlement.amount,
            status: settlement.status,
            created_at: settlement.created_at,
            payment_count: 0,
            payment_ids: []
          };
          
          if (settlement.entity_ids && Array.isArray(settlement.entity_ids)) {
            const paymentIds = settlement.entity_ids.filter(id => id && id.startsWith('pay_'));
            details.payment_count = paymentIds.length;
            details.payment_ids = paymentIds;
            
            paymentIds.forEach(paymentId => {
              paymentToSettlementMap[paymentId] = settlement.id;
            });
          }
          
          settlementDetails.push(details);
        }
        
        console.log('Recent settlements:');
        settlementDetails.forEach((s, idx) => {
          const date = new Date(s.created_at * 1000).toISOString().split('T')[0];
          console.log(`   ${idx + 1}. ${s.id} | Amount: ₹${(s.amount / 100).toFixed(2)} | Payments: ${s.payment_count} | Date: ${date} | Status: ${s.status}`);
        });
        
        console.log();
        console.log(`Total payment IDs in settlements: ${Object.keys(paymentToSettlementMap).length}`);
        
        // Step 3: Cross-check pending earnings with settlements
        if (pendingEarnings.length > 0) {
          console.log();
          console.log('='.repeat(80));
          console.log('🔄 CROSS-CHECKING PENDING EARNINGS WITH SETTLEMENTS');
          console.log('-'.repeat(80));
          
          let foundInSettlement = 0;
          let notFoundInSettlement = 0;
          const needsSync = [];
          
          for (const earning of pendingEarnings) {
            const paymentId = earning.razorpay_payment_id;
            const settlementId = paymentToSettlementMap[paymentId];
            
            if (settlementId) {
              foundInSettlement++;
              needsSync.push({
                earning_id: earning.id,
                payment_id: paymentId,
                settlement_id: settlementId,
                amount: earning.amount,
                recipient: `${earning.recipient_type}#${earning.recipient_id}`
              });
            } else {
              notFoundInSettlement++;
            }
          }
          
          console.log(`✅ Found in settlements: ${foundInSettlement} earnings`);
          console.log(`⏳ Not yet settled: ${notFoundInSettlement} earnings`);
          
          if (needsSync.length > 0) {
            console.log();
            console.log('⚠️  EARNINGS THAT NEED SYNC (found in settlements but still marked as pending):');
            needsSync.forEach((item, idx) => {
              console.log(`   ${idx + 1}. Earning #${item.earning_id} | Payment: ${item.payment_id} | Settlement: ${item.settlement_id}`);
              console.log(`      Amount: ₹${parseFloat(item.amount).toFixed(2)} | Recipient: ${item.recipient}`);
            });
            
            console.log();
            console.log('💡 RECOMMENDATION:');
            console.log('   Run the settlement sync to update these earnings:');
            console.log('   - For specific recipient: POST /api/earnings/sync-settlement (with auth token)');
            console.log('   - For all recipients (admin): POST /api/admin/earnings/sync-all-settlements');
            console.log('   - Or run: node backend/scripts/sync-all-settlements.js');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching settlements from Razorpay:', error.message);
      console.log('   This could indicate:');
      console.log('   - Razorpay API credentials are not configured correctly');
      console.log('   - Network connectivity issues');
      console.log('   - Razorpay API is temporarily unavailable');
    }
    
    console.log();
    console.log('='.repeat(80));
    
    // Step 4: Check available balances
    console.log('💰 AVAILABLE BALANCES');
    console.log('-'.repeat(80));
    
    let balanceQuery = `
      SELECT 
        recipient_id,
        recipient_type,
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
        COUNT(*) FILTER (WHERE status = 'available') as available_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count
      FROM earnings
    `;
    
    const balanceParams = [];
    if (recipientId) {
      balanceQuery += ` WHERE recipient_id = $1`;
      balanceParams.push(recipientId);
    }
    
    balanceQuery += `
      GROUP BY recipient_id, recipient_type
      HAVING COALESCE(SUM(amount), 0) > 0
      ORDER BY recipient_type, recipient_id
    `;
    
    const balanceResult = await db.query(balanceQuery, balanceParams);
    const balances = balanceResult.rows;
    
    if (balances.length === 0) {
      console.log('No earnings found for any recipients.');
    } else {
      console.log(`Found ${balances.length} recipients with earnings:\n`);
      
      balances.forEach((b, idx) => {
        console.log(`   ${idx + 1}. ${b.recipient_type} #${b.recipient_id}`);
        console.log(`      Available Balance: ₹${parseFloat(b.available_balance).toFixed(2)} (${b.available_count} earnings)`);
        console.log(`      Pending: ₹${parseFloat(b.pending_earnings).toFixed(2)} (${b.pending_count} earnings)`);
        console.log(`      Withdrawn: ₹${parseFloat(b.withdrawn_amount).toFixed(2)}`);
        console.log();
      });
    }
    
    console.log('='.repeat(80));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
    console.error(error.stack);
  } finally {
    await db.end();
  }
}

// Parse command line arguments
const recipientId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (recipientId) {
  console.log(`Running diagnostic for recipient ID: ${recipientId}\n`);
} else {
  console.log('Running diagnostic for all recipients\n');
}

checkSettlementSync(recipientId)
  .then(() => {
    console.log('\nDiagnostic completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nDiagnostic failed:', error);
    process.exit(1);
  });
