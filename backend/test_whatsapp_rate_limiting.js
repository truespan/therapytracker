/**
 * Test script to verify WhatsApp rate limiting and queue system
 * This simulates the dual notification scenario that was causing 429 errors
 */

const whatsappService = require('./src/services/whatsappService');

// Test data
const testAppointmentData = {
  userName: 'Test Client',
  therapistName: 'Dr. Test Therapist',
  appointmentDate: new Date(),
  appointmentTime: '10:00 AM',
  timezone: 'IST',
  appointmentType: 'Therapy Session',
  duration: 60
};

const therapistAppointmentData = {
  therapistName: 'Dr. Test Therapist',
  clientName: 'Test Client',
  appointmentDate: new Date(),
  appointmentTime: '10:00 AM',
  timezone: 'IST',
  appointmentType: 'Therapy Session',
  duration: 60,
  clientPhone: '+919876543210',
  clientEmail: 'test@example.com'
};

async function testRateLimiting() {
  console.log('🧪 Testing WhatsApp Rate Limiting Solution\n');
  
  // Check if WhatsApp service is enabled and configured
  const status = whatsappService.getStatus();
  console.log('WhatsApp Service Status:', JSON.stringify(status, null, 2));
  
  if (!status.enabled) {
    console.log('\n❌ WhatsApp service is disabled. Please enable it in .env file');
    return;
  }
  
  const configValidation = whatsappService.validateConfig();
  console.log('\nConfiguration Validation:', JSON.stringify(configValidation, null, 2));
  
  if (!configValidation.valid) {
    console.log('\n❌ Configuration validation failed. Please check your .env settings');
    return;
  }
  
  console.log('\n✅ Configuration is valid. Starting rate limiting test...\n');
  
  // Simulate dual notification scenario (client + therapist)
  // This is what was causing the 429 errors before
  console.log('📱 Sending dual notifications (client + therapist)...');
  console.log('This would previously cause 429 Too Many Requests error\n');
  
  try {
    // Send client notification
    const clientResult = await whatsappService.sendAppointmentConfirmation(
      '+919876543210', // test client number
      testAppointmentData,
      999, // test appointment ID
      1    // test user ID
    );
    
    console.log('Client notification result:', JSON.stringify(clientResult, null, 2));
    
    // Send therapist notification (this would fail with 429 before the fix)
    const therapistResult = await whatsappService.sendTherapistAppointmentNotification(
      '+919876543211', // test therapist number
      therapistAppointmentData,
      999, // test appointment ID
      1    // test partner ID
    );
    
    console.log('Therapist notification result:', JSON.stringify(therapistResult, null, 2));
    
    console.log('\n⏳ Messages have been added to the queue. Waiting for processing...\n');
    
    // Wait for queue to process (messages are sent with 2-second delays)
    console.log('Queue will process messages with the following delays:');
    console.log('- 2 seconds minimum between messages');
    console.log('- Exponential backoff on failures (5s, 10s, 20s)');
    console.log('- Maximum 3 retries per message\n');
    
    // Monitor queue status
    let checkCount = 0;
    const maxChecks = 10;
    
    const checkQueue = setInterval(() => {
      checkCount++;
      const queueLength = whatsappService.messageQueue?.length || 0;
      const isProcessing = whatsappService.isProcessingQueue;
      
      console.log(`Check ${checkCount}: Queue length = ${queueLength}, Processing = ${isProcessing}`);
      
      if (queueLength === 0 && !isProcessing) {
        console.log('\n✅ Queue is empty and not processing. Test completed successfully!');
        clearInterval(checkQueue);
        process.exit(0);
      }
      
      if (checkCount >= maxChecks) {
        console.log('\n⚠️  Max checks reached. Queue may still be processing.');
        clearInterval(checkQueue);
        process.exit(0);
      }
    }, 3000); // Check every 3 seconds
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testRateLimiting().catch(error => {
  console.error('Fatal error running test:', error);
  process.exit(1);
});