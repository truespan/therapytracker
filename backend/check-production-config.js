/**
 * Quick diagnostic script to check production configuration
 * 
 * Run this on your production server to verify NODE_ENV is set correctly
 * 
 * Usage:
 * node check-production-config.js
 */

require('dotenv').config();

console.log('\n=== Production Configuration Check ===\n');

// Check NODE_ENV
const nodeEnv = process.env.NODE_ENV;
console.log('1. NODE_ENV Configuration:');
console.log(`   Current value: ${nodeEnv || 'NOT SET (defaults to development)'}`);

if (nodeEnv === 'production') {
  console.log('   ✓ CORRECT - Payment will be required in production');
} else {
  console.log('   ✗ INCORRECT - Payment will be BYPASSED');
  console.log('   Action needed: Set NODE_ENV=production on your server');
}
console.log();

// Check Razorpay configuration
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('2. Razorpay Configuration:');
if (razorpayKeyId && razorpayKeySecret) {
  console.log(`   Key ID: ${razorpayKeyId.substring(0, 15)}...`);
  
  if (razorpayKeyId.startsWith('rzp_test_')) {
    console.log('   Key Type: TEST KEY');
    console.log('   ⚠ Using test key - payments will be in test mode');
  } else if (razorpayKeyId.startsWith('rzp_live_')) {
    console.log('   Key Type: LIVE KEY');
    console.log('   ✓ Using live key - real payments will be processed');
  } else {
    console.log('   Key Type: UNKNOWN');
    console.log('   ⚠ Razorpay key format not recognized');
  }
} else {
  console.log('   ✗ Razorpay credentials not configured');
  console.log('   Action needed: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
}
console.log();

// Check payment bypass logic
const RazorpayService = require('./src/services/razorpayService');
const willBypassPayment = RazorpayService.isTestMode();

console.log('3. Payment Bypass Status:');
console.log(`   Will bypass payment: ${willBypassPayment ? 'YES' : 'NO'}`);

if (willBypassPayment) {
  console.log('   ✗ PROBLEM: Payments will be bypassed');
  console.log('   This means bookings will complete WITHOUT payment');
  console.log('   Action needed: Set NODE_ENV=production');
} else {
  console.log('   ✓ CORRECT: Payments will be required');
  console.log('   Bookings with fees will require Razorpay payment');
}
console.log();

// Summary
console.log('=== Summary ===\n');

if (nodeEnv === 'production' && !willBypassPayment) {
  console.log('✓ Configuration is CORRECT for production');
  console.log('  - NODE_ENV is set to production');
  console.log('  - Payment bypass is disabled');
  console.log('  - Razorpay payment will be required for paid bookings');
  console.log('\nYour production server is configured correctly! 🎉');
} else {
  console.log('✗ Configuration needs attention:');
  console.log();
  
  if (nodeEnv !== 'production') {
    console.log('  CRITICAL: Set NODE_ENV=production on your server');
    console.log('  Current: NODE_ENV=' + (nodeEnv || 'NOT SET'));
    console.log('  Required: NODE_ENV=production');
    console.log();
  }
  
  if (willBypassPayment) {
    console.log('  CRITICAL: Payment bypass is currently ENABLED');
    console.log('  This will allow bookings without payment');
    console.log('  Fix: Set NODE_ENV=production and restart server');
    console.log();
  }
  
  if (!razorpayKeyId || !razorpayKeySecret) {
    console.log('  WARNING: Razorpay credentials not configured');
    console.log('  Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    console.log();
  }
  
  console.log('\nSee PRODUCTION_DEPLOYMENT_STEPS.md for detailed instructions.');
}

console.log('\n=== Next Steps ===\n');

if (nodeEnv !== 'production') {
  console.log('1. Set NODE_ENV=production in your hosting platform');
  console.log('2. Restart your backend server');
  console.log('3. Run this script again to verify');
  console.log('4. Test a booking with Rs. 1 fee');
  console.log('5. Verify Razorpay payment modal appears');
} else {
  console.log('1. Deploy your latest code to production');
  console.log('2. Restart your backend server');
  console.log('3. Test a booking with Rs. 1 fee');
  console.log('4. Verify Razorpay payment modal appears');
  console.log('5. Check payment in Razorpay dashboard');
}

console.log();
