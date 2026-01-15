/**
 * Test script to verify payment bypass fix
 * 
 * This script tests that:
 * 1. In development (NODE_ENV=development), payment is bypassed
 * 2. In production (NODE_ENV=production), payment is ALWAYS required
 * 
 * Run with:
 * node test-payment-bypass-fix.js
 */

// Test the isTestMode function with different NODE_ENV values
function testIsTestMode() {
  console.log('\n=== Testing Payment Bypass Logic ===\n');

  // Save original NODE_ENV
  const originalEnv = process.env.NODE_ENV;

  // Test cases
  const testCases = [
    { env: 'development', expectedBypass: true, razorpayKey: 'rzp_test_abc123' },
    { env: 'development', expectedBypass: true, razorpayKey: 'rzp_live_xyz789' },
    { env: 'test', expectedBypass: true, razorpayKey: 'rzp_test_abc123' },
    { env: 'test', expectedBypass: true, razorpayKey: 'rzp_live_xyz789' },
    { env: 'production', expectedBypass: false, razorpayKey: 'rzp_test_abc123' },
    { env: 'production', expectedBypass: false, razorpayKey: 'rzp_live_xyz789' },
    { env: undefined, expectedBypass: true, razorpayKey: 'rzp_test_abc123' }, // defaults to development
  ];

  let allPassed = true;

  testCases.forEach((testCase, index) => {
    // Set environment
    if (testCase.env === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = testCase.env;
    }
    process.env.RAZORPAY_KEY_ID = testCase.razorpayKey;

    // Clear require cache to reload the module with new env
    delete require.cache[require.resolve('./src/services/razorpayService')];
    const RazorpayService = require('./src/services/razorpayService');

    // Test isTestMode
    const result = RazorpayService.isTestMode();
    const passed = result === testCase.expectedBypass;

    console.log(`Test ${index + 1}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  NODE_ENV: ${testCase.env || 'undefined (defaults to development)'}`);
    console.log(`  RAZORPAY_KEY_ID: ${testCase.razorpayKey}`);
    console.log(`  Expected bypass: ${testCase.expectedBypass}`);
    console.log(`  Actual bypass: ${result}`);
    console.log();

    if (!passed) {
      allPassed = false;
    }
  });

  // Restore original NODE_ENV
  if (originalEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv;
  }

  console.log('=== Test Summary ===');
  if (allPassed) {
    console.log('✓ All tests passed!');
    console.log('\nPayment bypass fix is working correctly:');
    console.log('- Development/Test: Payment bypassed ✓');
    console.log('- Production: Payment ALWAYS required ✓');
  } else {
    console.log('✗ Some tests failed!');
    console.log('Please review the implementation.');
  }

  return allPassed;
}

// Run tests
try {
  const success = testIsTestMode();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Error running tests:', error);
  process.exit(1);
}
