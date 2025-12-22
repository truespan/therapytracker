const whatsappService = require('./src/services/whatsappService');
require('dotenv').config();

async function testWhatsAppService() {
  console.log('=== Testing Updated WhatsApp Service ===\n');
  
  // Test 1: Check service status
  console.log('Test 1: Service Status');
  const status = whatsappService.getStatus();
  console.log('Status:', JSON.stringify(status, null, 2));
  
  // Test 2: Validate configuration
  console.log('\nTest 2: Configuration Validation');
  const validation = whatsappService.validateConfig();
  console.log('Validation:', JSON.stringify(validation, null, 2));
  
  if (!validation.valid) {
    console.log('\n❌ Configuration issues found:');
    validation.errors.forEach(error => console.log('  -', error));
    return;
  }
  
  // Test 3: Test integration with your number
  console.log('\nTest 3: Integration Test');
  const testPhone = '+919742991324'; // Your registered number
  
  console.log('Testing with phone:', testPhone);
  const result = await whatsappService.testIntegration(testPhone);
  
  if (result.success) {
    console.log('✅ Test message sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Phone:', result.phoneNumber);
  } else {
    console.log('❌ Test failed:', result.error);
    if (result.isSandboxError) {
      console.log('\n🔧 SANDBOX REGISTRATION REQUIRED!');
      console.log('The recipient number is not registered in your Vonage WhatsApp sandbox.');
      console.log('\nTo fix this:');
      console.log('1. Go to https://dashboard.nexmo.com/');
      console.log('2. Navigate to: Messages and Dispatch > Sandbox > WhatsApp');
      console.log('3. Add the following number to sandbox recipients:', testPhone);
      console.log('4. Make sure the number follows the sandbox format (e.g., 919742991324)');
      console.log('5. Save changes and try again');
    }
    if (result.details) {
      console.log('Error details:', JSON.stringify(result.details, null, 2));
    }
  }
  
  // Test 4: Test appointment message creation
  console.log('\nTest 4: Appointment Message Creation');
  const appointmentData = {
    userName: 'Test User',
    therapistName: 'Dr. Smith',
    appointmentDate: new Date('2025-12-25T10:00:00'),
    appointmentTime: '10:00 AM',
    timezone: 'IST',
    appointmentType: 'Therapy Session',
    duration: 60
  };
  
  const message = whatsappService.createAppointmentMessage(appointmentData);
  console.log('Generated message:');
  console.log(message);
  
  console.log('\n=== Test Complete ===');
}

testWhatsAppService().catch(console.error);