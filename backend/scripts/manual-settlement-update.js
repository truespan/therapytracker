/**
 * Manual settlement update script
 * Use this when you know the settlement_id from Razorpay dashboard
 * but the API doesn't return it
 */

const db = require('../src/config/database');
const Earnings = require('../src/models/Earnings');
const { getNextSaturday, formatDate } = require('../src/utils/dateUtils');
require('dotenv').config();

// Manual mappings from Razorpay dashboard
// Based on diagnostic output and Razorpay dashboard
const MANUAL_SETTLEMENTS = [
  // Partner TH71585 - Anahita Verma
  {
    payment_id: 'pay_S4EzoUPiSEFf6Z',
    settlement_id: 'setl_S4sBcxZ9wOEPYB',
    note: 'Partner TH71585 - Anahita Verma - ₹800.00'
  },
  // Partner TH78079 - Sanjeeb K S
  {
    payment_id: 'pay_RxTfjJidNjyeu1',
    settlement_id: 'setl_Ry8mGcrW22OAWX',
    note: 'Partner TH78079 - Sanjeeb K S - ₹101.00'
  },
  // Add more payment → settlement mappings from Razorpay dashboard here
  // You can find these in: Razorpay Dashboard → Settlements → Click settlement → View payments
];

async function manualSettlementUpdate() {
  try {
    console.log('='.repeat(80));
    console.log('MANUAL SETTLEMENT UPDATE');
    console.log('='.repeat(80));
    console.log('');

    console.log(`Processing ${MANUAL_SETTLEMENTS.length} manual settlement mappings...\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const mapping of MANUAL_SETTLEMENTS) {
      const { payment_id, settlement_id, note } = mapping;

      console.log(`Processing: ${payment_id} → ${settlement_id}`);
      if (note) {
        console.log(`  Note: ${note}`);
      }

      try {
        // Check if earnings record exists
        const earnings = await Earnings.findByPaymentId(payment_id);

        if (!earnings) {
          console.log(`  ❌ No earnings record found for payment ${payment_id}`);
          errors++;
          continue;
        }

        console.log(`  Found earnings record #${earnings.id}`);
        console.log(`  Current status: ${earnings.status}`);
        console.log(`  Amount: ₹${parseFloat(earnings.amount).toFixed(2)}`);

        if (earnings.status === 'available') {
          console.log(`  ⏭️  Already marked as available - skipping`);
          skipped++;
          continue;
        }

        if (earnings.status === 'withdrawn') {
          console.log(`  ⏭️  Already withdrawn - skipping`);
          skipped++;
          continue;
        }

        // Update to available
        const nextSaturday = getNextSaturday();
        const payoutDate = formatDate(nextSaturday);

        const updated_earnings = await Earnings.updateStatusByPaymentId(
          payment_id,
          'available',
          payoutDate,
          settlement_id
        );

        if (updated_earnings) {
          console.log(`  ✅ Updated to available`);
          console.log(`     Settlement ID: ${settlement_id}`);
          console.log(`     Payout Date: ${payoutDate}`);
          updated++;
        } else {
          console.log(`  ⚠️  Update returned no rows - payment might have already been updated`);
          skipped++;
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Processed: ${MANUAL_SETTLEMENTS.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  }
}

// Run the update
manualSettlementUpdate()
  .then(() => {
    console.log('\nManual update completed successfully.');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nUpdate failed:', error);
    db.end().finally(() => {
      process.exit(1);
    });
  });
