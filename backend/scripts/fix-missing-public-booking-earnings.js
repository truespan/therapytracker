/**
 * Script to fix missing earnings records for public_booking payments
 * Specifically for payment pay_S4EzoUPiSEFf6Z and any other missing ones
 */

const db = require('../src/config/database');
const Earnings = require('../src/models/Earnings');
require('dotenv').config();

async function fixMissingEarnings() {
  try {
    console.log('='.repeat(80));
    console.log('FIXING MISSING EARNINGS FOR PUBLIC_BOOKING PAYMENTS');
    console.log('='.repeat(80));
    console.log('');

    // Find all captured/authorized payments without earnings records
    // Join with razorpay_orders to get the notes field
    const query = `
      SELECT
        rp.id,
        rp.razorpay_payment_id,
        rp.razorpay_order_id,
        rp.amount,
        rp.currency,
        rp.status,
        rp.metadata,
        rp.created_at,
        ro.notes as order_notes
      FROM razorpay_payments rp
      LEFT JOIN razorpay_orders ro ON ro.razorpay_order_id = rp.razorpay_order_id
      LEFT JOIN earnings e ON e.razorpay_payment_id = rp.razorpay_payment_id
      WHERE rp.status IN ('captured', 'authorized')
        AND e.id IS NULL
      ORDER BY rp.created_at DESC
    `;

    const result = await db.query(query);
    const paymentsWithoutEarnings = result.rows;

    console.log(`Found ${paymentsWithoutEarnings.length} payments without earnings records\n`);

    if (paymentsWithoutEarnings.length === 0) {
      console.log('✅ No missing earnings to fix!');
      return;
    }

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const payment of paymentsWithoutEarnings) {
      console.log(`\nProcessing payment: ${payment.razorpay_payment_id}`);
      console.log(`  Amount: ₹${parseFloat(payment.amount).toFixed(2)}`);
      console.log(`  Status: ${payment.status}`);
      console.log(`  Created: ${payment.created_at}`);

      try {
        // Parse notes from order to check payment type
        let notes = {};
        if (payment.order_notes) {
          notes = typeof payment.order_notes === 'string' ? JSON.parse(payment.order_notes) : payment.order_notes;
        }

        console.log(`  Payment Type: ${notes.payment_type || 'N/A'}`);

        // Only process booking payments
        if (notes.payment_type !== 'booking_fee' && notes.payment_type !== 'public_booking') {
          console.log(`  ⏭️  Skipping - not a booking payment`);
          skipped++;
          continue;
        }

        const partnerId = notes.partner_id;
        const slotId = notes.slot_id;

        if (!partnerId) {
          console.log(`  ❌ Error: No partner_id in notes`);
          errors++;
          continue;
        }

        console.log(`  Partner ID: ${partnerId}`);
        console.log(`  Slot ID: ${slotId || 'N/A'}`);

        // For public_booking, partner_id is the internal database ID
        // For booking_fee, we'd need to look it up by partner_id string
        let partnerDbId = partnerId;

        if (notes.payment_type === 'booking_fee') {
          // Need to find internal ID from partner_id string
          const partnerQuery = `SELECT id FROM partners WHERE partner_id = $1`;
          const partnerResult = await db.query(partnerQuery, [partnerId]);

          if (partnerResult.rows.length === 0) {
            console.log(`  ❌ Error: Partner not found for partner_id: ${partnerId}`);
            errors++;
            continue;
          }

          partnerDbId = partnerResult.rows[0].id;
        }

        // Try to find appointment_id from slot if available
        let appointmentId = null;
        if (slotId) {
          const slotQuery = `SELECT appointment_id FROM availability_slots WHERE id = $1`;
          const slotResult = await db.query(slotQuery, [slotId]);
          if (slotResult.rows[0] && slotResult.rows[0].appointment_id) {
            appointmentId = slotResult.rows[0].appointment_id;
            console.log(`  Appointment ID: ${appointmentId}`);
          }
        }

        // Create earnings record
        const earningsData = {
          recipient_id: partnerDbId,
          recipient_type: 'partner',
          razorpay_payment_id: payment.razorpay_payment_id,
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          status: 'pending', // Will be updated by settlement sync
          appointment_id: appointmentId,
          payout_date: null
        };

        console.log(`  Creating earnings record...`);
        const earnings = await Earnings.create(earningsData);

        console.log(`  ✅ Created earnings record #${earnings.id}`);
        console.log(`     Recipient: Partner #${partnerDbId}`);
        console.log(`     Amount: ₹${parseFloat(earnings.amount).toFixed(2)}`);
        console.log(`     Status: ${earnings.status}`);

        fixed++;

      } catch (error) {
        console.log(`  ❌ Error processing payment: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Payments Processed: ${paymentsWithoutEarnings.length}`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(80));

    if (fixed > 0) {
      console.log('\n⚠️  IMPORTANT: Run the settlement sync script to update these to "available" status:');
      console.log('   node backend/scripts/sync-all-settlements.js');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  }
}

// Run the fix
fixMissingEarnings()
  .then(() => {
    console.log('\nScript completed successfully.');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    db.end().finally(() => {
      process.exit(1);
    });
  });
