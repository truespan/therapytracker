/**
 * Diagnostic script for partner TH78079
 * Payment: pay_RxTfjJidNjyeu1
 * Settlement: setl_Ry8mGcrW22OAWX
 */

const db = require('../src/config/database');
require('dotenv').config();

const PARTNER_ID = 'TH78079';
const PAYMENT_ID = 'pay_RxTfjJidNjyeu1';
const SETTLEMENT_ID = 'setl_Ry8mGcrW22OAWX';

async function diagnose() {
  try {
    console.log('='.repeat(80));
    console.log('DIAGNOSTIC FOR PARTNER TH78079');
    console.log('='.repeat(80));
    console.log('');

    // 1. Find partner by partner_id
    console.log('1. Looking up partner...');
    const partnerQuery = `SELECT id, partner_id, name, email FROM partners WHERE partner_id = $1`;
    const partnerResult = await db.query(partnerQuery, [PARTNER_ID]);

    if (partnerResult.rows.length === 0) {
      console.log('❌ Partner not found!');
      return;
    }

    const partner = partnerResult.rows[0];
    console.log(`✅ Found partner: ID=${partner.id}, Name=${partner.name}, Email=${partner.email}`);
    console.log('');

    // 2. Check earnings summary
    console.log('2. Checking earnings summary...');
    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
        COUNT(*) as total_records
      FROM earnings
      WHERE recipient_id = $1 AND recipient_type = 'partner'
    `;
    const summaryResult = await db.query(summaryQuery, [partner.id]);
    const summary = summaryResult.rows[0];

    console.log(`   Available Balance: ₹${parseFloat(summary.available_balance).toFixed(2)}`);
    console.log(`   Pending Earnings: ₹${parseFloat(summary.pending_earnings).toFixed(2)}`);
    console.log(`   Withdrawn Amount: ₹${parseFloat(summary.withdrawn_amount).toFixed(2)}`);
    console.log(`   Total Records: ${summary.total_records}`);
    console.log('');

    // 3. Check all earnings records
    console.log('3. Checking all earnings records...');
    const earningsQuery = `
      SELECT id, razorpay_payment_id, razorpay_settlement_id, amount, status, created_at, updated_at
      FROM earnings
      WHERE recipient_id = $1 AND recipient_type = 'partner'
      ORDER BY created_at DESC
    `;
    const earningsResult = await db.query(earningsQuery, [partner.id]);

    if (earningsResult.rows.length === 0) {
      console.log('❌ NO EARNINGS RECORDS FOUND!');
      console.log('   This is the problem - earnings were never created for this partner.');
    } else {
      console.log(`✅ Found ${earningsResult.rows.length} earnings records:`);
      earningsResult.rows.forEach((e, idx) => {
        console.log(`   ${idx + 1}. Earnings #${e.id}`);
        console.log(`      Payment: ${e.razorpay_payment_id || 'N/A'}`);
        console.log(`      Settlement: ${e.razorpay_settlement_id || 'N/A'}`);
        console.log(`      Amount: ₹${parseFloat(e.amount).toFixed(2)}`);
        console.log(`      Status: ${e.status}`);
        console.log(`      Created: ${e.created_at}`);
        if (e.razorpay_payment_id === PAYMENT_ID) {
          console.log('      ⭐ THIS IS THE PAYMENT IN QUESTION!');
        }
      });
    }
    console.log('');

    // 4. Check for the specific payment in earnings
    console.log('4. Checking for specific payment in earnings...');
    const paymentEarningsQuery = `
      SELECT * FROM earnings WHERE razorpay_payment_id = $1
    `;
    const paymentEarningsResult = await db.query(paymentEarningsQuery, [PAYMENT_ID]);

    if (paymentEarningsResult.rows.length === 0) {
      console.log(`❌ No earnings record for payment ${PAYMENT_ID}`);
      console.log('   THIS IS THE ROOT CAUSE - earnings was never created!');
    } else {
      const e = paymentEarningsResult.rows[0];
      console.log(`✅ Found earnings for payment ${PAYMENT_ID}:`);
      console.log(`   Earnings ID: ${e.id}`);
      console.log(`   Recipient ID: ${e.recipient_id} (${e.recipient_type})`);
      console.log(`   Amount: ₹${parseFloat(e.amount).toFixed(2)}`);
      console.log(`   Status: ${e.status}`);
      console.log(`   Settlement ID: ${e.razorpay_settlement_id || 'N/A'}`);
    }
    console.log('');

    // 5. Check razorpay_payments table
    console.log('5. Checking razorpay_payments table...');
    const rpQuery = `SELECT * FROM razorpay_payments WHERE razorpay_payment_id = $1`;
    const rpResult = await db.query(rpQuery, [PAYMENT_ID]);

    if (rpResult.rows.length === 0) {
      console.log(`❌ Payment ${PAYMENT_ID} not found in razorpay_payments table`);
    } else {
      const rp = rpResult.rows[0];
      console.log(`✅ Found payment in razorpay_payments:`);
      console.log(`   Payment ID: ${rp.razorpay_payment_id}`);
      console.log(`   Order ID: ${rp.razorpay_order_id}`);
      console.log(`   Amount: ₹${parseFloat(rp.amount).toFixed(2)}`);
      console.log(`   Status: ${rp.status}`);
      console.log(`   Created: ${rp.created_at}`);
    }
    console.log('');

    // 6. Check razorpay_orders table for order notes
    if (rpResult.rows.length > 0 && rpResult.rows[0].razorpay_order_id) {
      console.log('6. Checking razorpay_orders for payment metadata...');
      const orderQuery = `SELECT * FROM razorpay_orders WHERE razorpay_order_id = $1`;
      const orderResult = await db.query(orderQuery, [rpResult.rows[0].razorpay_order_id]);

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        console.log(`✅ Found order:`);
        console.log(`   Order ID: ${order.razorpay_order_id}`);
        console.log(`   Amount: ₹${parseFloat(order.amount).toFixed(2)}`);
        console.log(`   Status: ${order.status}`);

        let notes = {};
        if (order.notes) {
          notes = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
        }
        console.log(`   Payment Type: ${notes.payment_type || 'N/A'}`);
        console.log(`   Partner ID (from notes): ${notes.partner_id || 'N/A'}`);
        console.log(`   Slot ID: ${notes.slot_id || 'N/A'}`);
      } else {
        console.log(`❌ Order not found`);
      }
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(80));

    if (earningsResult.rows.length === 0) {
      console.log('❌ ROOT CAUSE: No earnings records exist for this partner!');
      console.log('   The payments were captured but earnings were never created.');
      console.log('   This is likely because the webhook handler failed or was not configured.');
      console.log('');
      console.log('   SOLUTION: Run the fix-missing-public-booking-earnings.js script to create');
      console.log('   missing earnings records for all captured payments.');
    } else if (paymentEarningsResult.rows.length === 0) {
      console.log('❌ ROOT CAUSE: Earnings record missing for payment ' + PAYMENT_ID);
      console.log('   Other earnings exist but not for this specific payment.');
      console.log('');
      console.log('   SOLUTION: Check why this payment\'s earnings was not created.');
    } else {
      const e = paymentEarningsResult.rows[0];
      if (e.status === 'pending') {
        console.log('❌ ROOT CAUSE: Earnings exists but status is still PENDING');
        console.log(`   Settlement ID: ${e.razorpay_settlement_id || 'NOT SET'}`);
        console.log('');
        console.log('   SOLUTION: Run manual settlement update or wait for settlement sync cron job.');
      } else if (e.status === 'available') {
        console.log('✅ Earnings status is AVAILABLE - should show in balance');
        console.log('   If not showing, check the frontend query or earnings summary calculation.');
      } else if (e.status === 'withdrawn') {
        console.log('ℹ️  Earnings status is WITHDRAWN - already paid out');
      }
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    throw error;
  }
}

// Run diagnostic
diagnose()
  .then(() => {
    console.log('\nDiagnostic completed.');
    return db.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nDiagnostic failed:', error);
    db.end().finally(() => {
      process.exit(1);
    });
  });
