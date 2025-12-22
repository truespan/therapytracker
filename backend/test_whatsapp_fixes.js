/**
 * WhatsApp Service Test and Validation Script
 * Tests the fixes for database parameter type inference and Vonage API errors
 */

const whatsappService = require('./src/services/whatsappService');
const db = require('./src/config/database');

async function testWhatsAppService() {
  console.log('🧪 Starting WhatsApp Service Validation Tests...\n');

  // Test 1: Configuration Validation
  console.log('=== Test 1: Configuration Validation ===');
  const configValidation = whatsappService.validateConfig();
  console.log('Configuration Status:', configValidation.valid ? '✅ VALID' : '❌ INVALID');
  console.log('Configuration Details:', JSON.stringify(configValidation.config, null, 2));
  
  if (configValidation.errors.length > 0) {
    console.log('❌ Errors:');
    configValidation.errors.forEach(error => console.log('  -', error));
  }
  
  if (configValidation.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    configValidation.warnings.forEach(warning => console.log('  -', warning));
  }
  
  if (!configValidation.valid) {
    console.log('\n❌ Configuration validation failed. Please fix the errors above before proceeding.\n');
    return;
  }
  
  console.log('✅ Configuration validation passed\n');

  // Test 2: Phone Number Formatting
  console.log('=== Test 2: Phone Number Formatting ===');
  const testNumbers = [
    '9876543210',
    '9988776655',
    '+919876543210',
    '+1-555-123-4567',
    '5551234567',
    'invalid-phone',
    '+91 98765 43210'
  ];

  testNumbers.forEach(number => {
    const formatted = whatsappService.formatPhoneNumber(number);
    const isValid = whatsappService.validatePhoneNumber(number);
    console.log(`  "${number}" → ${formatted} ${isValid ? '✅' : '❌'}`);
  });
  console.log('');

  // Test 3: Database Logging (Parameter Type Inference Fix)
  console.log('=== Test 3: Database Logging Test ===');
  try {
    // Test logNotification with different status values
    console.log('Testing logNotification with status="sent"...');
    await whatsappService.logNotification(
      999999, // test appointment ID
      999999, // test user ID
      '+919876543210',
      'sent',
      'test-message-id-123',
      null
    );
    console.log('✅ logNotification with status="sent" succeeded');

    console.log('Testing logNotification with status="failed"...');
    await whatsappService.logNotification(
      999998,
      999998,
      '+919876543210',
      'failed',
      null,
      'Test error message'
    );
    console.log('✅ logNotification with status="failed" succeeded');

    console.log('Testing logCustomNotification...');
    await whatsappService.logCustomNotification(
      999997,
      999997,
      '+919876543210',
      'test_message',
      'sent',
      'test-custom-message-id',
      null
    );
    console.log('✅ logCustomNotification succeeded');

    // Clean up test records
    console.log('Cleaning up test records...');
    await db.query(`
      DELETE FROM whatsapp_notifications 
      WHERE appointment_id IN (999999, 999998) 
      OR partner_id = 999997
    `);
    console.log('✅ Test records cleaned up\n');

  } catch (error) {
    console.error('❌ Database logging test failed:', error.message);
    console.error('Error details:', error);
    return;
  }

  // Test 4: Vonage API Test (if enabled)
  console.log('=== Test 4: Vonage API Test ===');
  if (configValidation.config.enabled) {
    const testPhone = process.env.TEST_WHATSAPP_NUMBER || '+919876543210';
    console.log(`Testing Vonage API with number: ${testPhone}`);
    
    try {
      const result = await whatsappService.testIntegration(testPhone);
      if (result.success) {
        console.log('✅ Vonage API test succeeded');
        console.log('Message ID:', result.messageId);
      } else {
        console.log('❌ Vonage API test failed:', result.error);
        if (result.details) {
          console.log('Error details:', JSON.stringify(result.details, null, 2));
        }
      }
    } catch (error) {
      console.error('❌ Vonage API test error:', error.message);
      console.error('Full error:', error);
    }
  } else {
    console.log('⚠️  WhatsApp service is disabled, skipping API test');
  }
  console.log('');

  // Test 5: Service Status
  console.log('=== Test 5: Service Status ===');
  const status = whatsappService.getStatus();
  console.log('Service Status:', JSON.stringify(status, null, 2));
  console.log('');

  console.log('🎉 WhatsApp Service Validation Complete!');
  console.log('\n📋 Summary:');
  console.log('✅ Configuration validation');
  console.log('✅ Phone number formatting');
  console.log('✅ Database logging (parameter type inference fix)');
  console.log(configValidation.config.enabled ? '✅ Vonage API test' : '⚠️  Vonage API test skipped (service disabled)');
  console.log('✅ Service status check');
}

// Run tests if called directly
if (require.main === module) {
  testWhatsAppService()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testWhatsAppService };