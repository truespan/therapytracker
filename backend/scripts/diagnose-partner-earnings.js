/**
 * Diagnostic script to check earnings for partner TH71585
 * Payment ID: pay_S4EzoUPiSEFf6Z
 * Settlement ID: setl_S4sBcxZ9wOEPYB
 */

const db = require('../src/config/database');
const RazorpayService = require('../src/services/razorpayService');
require('dotenv').config();

const PARTNER_ID = 'TH71585';
const PAYMENT_ID = 'pay_S4EzoUPiSEFf6Z';
const SETTLEMENT_ID = 'setl_S4sBcxZ9wOEPYB';

async function diagnosePartnerEarnings() {
  try {
    console.log('='.repeat(80));
    console.log('PARTNER EARNINGS DIAGNOSTIC');
    console.log('='.repeat(80));
    console.log(`Partner ID: ${PARTNER_ID}`);
    console.log(`Payment ID: ${PAYMENT_ID}`);
    console.log(`Settlement ID: ${SETTLEMENT_ID}`);
    console.log('='.repeat(80));
    console.log('');

    // 1. Check if partner exists
    console.log('1. Checking if partner exists...');
    const partnerQuery = `
      SELECT id, partner_id, name, email, contact, organization_id
      FROM partners
      WHERE partner_id = $1
    `;
    const partnerResult = await db.query(partnerQuery, [PARTNER_ID]);

    if (partnerResult.rows.length === 0) {
      console.log('❌ Partner not found in database!');
      return;
    }

    const partner = partnerResult.rows[0];
    console.log('✅ Partner found:');
    console.log(`   ID: ${partner.id}`);
    console.log(`   Partner ID: ${partner.partner_id}`);
    console.log(`   Name: ${partner.name}`);
    console.log(`   Email: ${partner.email || 'N/A'}`);
    console.log(`   Contact: ${partner.contact}`);
    console.log(`   Organization ID: ${partner.organization_id}`);
    console.log('');

    // 2. Check earnings summary
    console.log('2. Checking earnings summary...');
    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings,
        COUNT(*) as total_records
      FROM earnings
      WHERE recipient_id = $1 AND recipient_type = 'partner'
    `;
    const summaryResult = await db.query(summaryQuery, [partner.id]);
    const summary = summaryResult.rows[0];

    console.log('   Available Balance: ₹' + parseFloat(summary.available_balance).toFixed(2));
    console.log('   Pending Earnings: ₹' + parseFloat(summary.pending_earnings).toFixed(2));
    console.log('   Withdrawn Amount: ₹' + parseFloat(summary.withdrawn_amount).toFixed(2));
    console.log('   Total Earnings: ₹' + parseFloat(summary.total_earnings).toFixed(2));
    console.log('   Total Records: ' + summary.total_records);
    console.log('');

    // 3. Check all earnings records
    console.log('3. Checking all earnings records...');
    const earningsQuery = `
      SELECT id, razorpay_payment_id, razorpay_settlement_id, amount, status,
             created_at, updated_at, payout_date, session_id, appointment_id
      FROM earnings
      WHERE recipient_id = $1 AND recipient_type = 'partner'
      ORDER BY created_at DESC
    `;
    const earningsResult = await db.query(earningsQuery, [partner.id]);

    if (earningsResult.rows.length === 0) {
      console.log('❌ No earnings records found!');
    } else {
      console.log(`✅ Found ${earningsResult.rows.length} earnings records:`);
      earningsResult.rows.forEach((e, idx) => {
        console.log(`   ${idx + 1}. ID: ${e.id} | Payment: ${e.razorpay_payment_id || 'N/A'} | Settlement: ${e.razorpay_settlement_id || 'N/A'}`);
        console.log(`      Amount: ₹${parseFloat(e.amount).toFixed(2)} | Status: ${e.status} | Created: ${e.created_at}`);
        console.log(`      Session: ${e.session_id || 'N/A'} | Appointment: ${e.appointment_id || 'N/A'}`);
      });
    }
    console.log('');

    // 4. Check for specific payment ID
    console.log('4. Checking for specific payment ID in earnings...');
    const paymentEarningsQuery = `
      SELECT * FROM earnings WHERE razorpay_payment_id = $1
    `;
    const paymentEarningsResult = await db.query(paymentEarningsQuery, [PAYMENT_ID]);

    if (paymentEarningsResult.rows.length === 0) {
      console.log(`❌ No earnings record found for payment ${PAYMENT_ID}`);
    } else {
      console.log(`✅ Found earnings record for payment ${PAYMENT_ID}:`);
      const e = paymentEarningsResult.rows[0];
      console.log(`   Earnings ID: ${e.id}`);
      console.log(`   Recipient ID: ${e.recipient_id} (${e.recipient_type})`);
      console.log(`   Amount: ₹${parseFloat(e.amount).toFixed(2)}`);
      console.log(`   Status: ${e.status}`);
      console.log(`   Settlement ID: ${e.razorpay_settlement_id || 'N/A'}`);
      console.log(`   Created: ${e.created_at}`);
      console.log(`   Updated: ${e.updated_at}`);
    }
    console.log('');

    // 5. Check razorpay_payments table
    console.log('5. Checking razorpay_payments table...');
    const rpPaymentQuery = `
      SELECT * FROM razorpay_payments WHERE razorpay_payment_id = $1
    `;
    const rpPaymentResult = await db.query(rpPaymentQuery, [PAYMENT_ID]);

    if (rpPaymentResult.rows.length === 0) {
      console.log(`❌ No record found in razorpay_payments for ${PAYMENT_ID}`);
    } else {
      console.log(`✅ Found record in razorpay_payments:`);
      const rp = rpPaymentResult.rows[0];
      console.log(`   Payment ID: ${rp.razorpay_payment_id}`);
      console.log(`   Order ID: ${rp.razorpay_order_id}`);
      console.log(`   Amount: ₹${parseFloat(rp.amount).toFixed(2)}`);
      console.log(`   Status: ${rp.status}`);
      console.log(`   Created: ${rp.created_at}`);
    }
    console.log('');

    // 6. Fetch payment details from Razorpay API
    console.log('6. Fetching payment details from Razorpay API...');
    try {
      const payment = await RazorpayService.fetchPayment(PAYMENT_ID);
      console.log('✅ Payment found in Razorpay:');
      console.log(`   ID: ${payment.id}`);
      console.log(`   Amount: ₹${(payment.amount / 100).toFixed(2)}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Settlement ID: ${payment.settlement_id || 'NOT YET SETTLED'}`);
      console.log(`   Created: ${new Date(payment.created_at * 1000).toISOString()}`);
      console.log(`   Method: ${payment.method}`);
      console.log(`   Order ID: ${payment.order_id}`);
      console.log('');
      console.log('   Full payment object:');
      console.log(JSON.stringify(payment, null, 2));
    } catch (error) {
      console.log(`❌ Error fetching payment from Razorpay: ${error.message}`);
    }
    console.log('');

    // 7. Check related appointment/session
    console.log('7. Checking related appointments and sessions...');
    const appointmentQuery = `
      SELECT a.id, a.appointment_id, a.partner_id, a.client_id, a.status,
             a.appointment_date, a.appointment_time, a.razorpay_payment_id
      FROM appointments a
      WHERE a.partner_id = $1
      ORDER BY a.created_at DESC
      LIMIT 10
    `;
    const appointmentResult = await db.query(appointmentQuery, [partner.id]);

    if (appointmentResult.rows.length === 0) {
      console.log('❌ No appointments found for this partner');
    } else {
      console.log(`✅ Found ${appointmentResult.rows.length} recent appointments:`);
      appointmentResult.rows.forEach((a, idx) => {
        console.log(`   ${idx + 1}. Appointment ID: ${a.appointment_id} | Payment: ${a.razorpay_payment_id || 'N/A'}`);
        console.log(`      Status: ${a.status} | Date: ${a.appointment_date} ${a.appointment_time}`);
        if (a.razorpay_payment_id === PAYMENT_ID) {
          console.log('      ⭐ THIS IS THE APPOINTMENT FOR THE PAYMENT IN QUESTION!');
        }
      });
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(80));

    if (paymentEarningsResult.rows.length === 0) {
      console.log('❌ ISSUE: No earnings record exists for this payment!');
      console.log('   Possible causes:');
      console.log('   1. Webhook was not processed properly');
      console.log('   2. Earnings record was never created');
      console.log('   3. Payment was captured but earnings creation failed');
      console.log('');
      console.log('   Recommended action:');
      console.log('   - Check webhook logs for this payment');
      console.log('   - Manually create earnings record if payment is valid');
    } else {
      const e = paymentEarningsResult.rows[0];
      console.log(`✅ Earnings record exists (ID: ${e.id})`);
      console.log(`   Current status: ${e.status}`);
      console.log(`   Settlement ID in DB: ${e.razorpay_settlement_id || 'N/A'}`);

      if (e.status === 'pending') {
        console.log('   ⚠️  Status is still PENDING - needs settlement sync');
      } else if (e.status === 'available') {
        console.log('   ✅ Status is AVAILABLE - should show in balance');
      } else if (e.status === 'withdrawn') {
        console.log('   ℹ️  Status is WITHDRAWN - already paid out');
      }
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    throw error;
  }
}

// Run the diagnostic
diagnosePartnerEarnings()
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
