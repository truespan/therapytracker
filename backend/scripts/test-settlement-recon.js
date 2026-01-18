/**
 * Test script for the new Settlement Recon API
 * Tests the fetchSettlementRecon() method to verify it works correctly
 * before running the full reconciliation
 */

const RazorpayService = require('../src/services/razorpayService');
const db = require('../src/config/database');
require('dotenv').config();

async function testSettlementRecon() {
  try {
    console.log('='.repeat(80));
    console.log('SETTLEMENT RECON API TEST');
    console.log('='.repeat(80));
    console.log('');

    // Test current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS months are 0-indexed

    console.log(`Testing Settlement Recon API for ${year}-${String(month).padStart(2, '0')}...`);
    console.log('');

    const startTime = Date.now();

    const reconItems = await RazorpayService.fetchSettlementRecon({
      year: year,
      month: month,
      count: 100 // Fetch first 100 items for testing
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ API call successful! Duration: ${duration} seconds`);
    console.log(`Found ${reconItems.length} settlement items`);
    console.log('');

    if (reconItems.length === 0) {
      console.log('⚠️  No settlement items found for this month.');
      console.log('   This might be normal if no settlements have occurred yet.');
      console.log('');
      return;
    }

    // Analyze item types
    const itemTypes = {};
    const settlementIds = new Set();
    let paymentCount = 0;

    reconItems.forEach(item => {
      itemTypes[item.type] = (itemTypes[item.type] || 0) + 1;
      if (item.settlement_id) {
        settlementIds.add(item.settlement_id);
      }
      if (item.type === 'payment') {
        paymentCount++;
      }
    });

    console.log('SUMMARY:');
    console.log('-'.repeat(80));
    console.log(`Total Items: ${reconItems.length}`);
    console.log(`Unique Settlements: ${settlementIds.size}`);
    console.log('');
    console.log('Item Types:');
    Object.entries(itemTypes).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(15)}: ${count}`);
    });
    console.log('');
    console.log(`Payment Items: ${paymentCount}`);
    console.log('-'.repeat(80));
    console.log('');

    // Show first 3 payment items as samples
    const samplePayments = reconItems.filter(item => item.type === 'payment').slice(0, 3);

    if (samplePayments.length > 0) {
      console.log('SAMPLE PAYMENT ITEMS:');
      console.log('-'.repeat(80));

      samplePayments.forEach((item, idx) => {
        console.log(`Payment ${idx + 1}:`);
        console.log(`  Payment ID:    ${item.entity_id}`);
        console.log(`  Settlement ID: ${item.settlement_id}`);
        console.log(`  Amount:        ₹${(item.amount / 100).toFixed(2)}`);
        console.log(`  Fee:           ₹${(item.fee / 100).toFixed(2)}`);
        console.log(`  Tax:           ₹${(item.tax / 100).toFixed(2)}`);
        console.log(`  Settled:       ${item.settled ? 'Yes' : 'No'}`);
        console.log(`  Settled At:    ${item.settled_at ? new Date(item.settled_at * 1000).toISOString() : 'N/A'}`);
        console.log('');
      });

      console.log('-'.repeat(80));
    }

    // Test fetchPaymentsInSettlement for the first settlement
    if (settlementIds.size > 0) {
      const firstSettlementId = Array.from(settlementIds)[0];

      console.log('');
      console.log(`Testing fetchPaymentsInSettlement for settlement: ${firstSettlementId}`);
      console.log('-'.repeat(80));

      const paymentIds = await RazorpayService.fetchPaymentsInSettlement(
        firstSettlementId,
        { year, month }
      );

      console.log(`Found ${paymentIds.length} payment IDs in settlement ${firstSettlementId}`);

      if (paymentIds.length > 0) {
        console.log('');
        console.log('First 5 payment IDs:');
        paymentIds.slice(0, 5).forEach((id, idx) => {
          console.log(`  ${idx + 1}. ${id}`);
        });
      }

      console.log('-'.repeat(80));
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('');
    console.log('The Settlement Recon API is working correctly.');
    console.log('You can now run the backfill script to reconcile historical settlements.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(80));
    console.error('');
    throw error;
  }
}

// Run the test
testSettlementRecon()
  .then(() => {
    console.log('Test completed.');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
    db.end().finally(() => {
      process.exit(1);
    });
  });
