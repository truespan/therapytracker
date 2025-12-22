/**
 * Vonage API Error Diagnostic Script
 * Captures detailed error information for the 422 error
 */

const { Vonage } = require('@vonage/server-sdk');
require('dotenv').config();

async function diagnoseVonageError() {
  console.log('🔍 Diagnosing Vonage API Error...\n');

  // Initialize Vonage client directly
  const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET
  });

  const fromNumber = process.env.VONAGE_WHATSAPP_NUMBER;
  const toNumber = process.env.TEST_WHATSAPP_NUMBER || '+919876543210';

  console.log('Configuration:');
  console.log('  From Number:', fromNumber);
  console.log('  To Number:', toNumber);
  console.log('  API Key:', process.env.VONAGE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('  API Secret:', process.env.VONAGE_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');

  // Test message
  const messageBody = '🧪 *TheraP Track WhatsApp Test*\n\nThis is a test message from your TheraP Track system. If you received this, your WhatsApp integration is working correctly! ✅';

  console.log('Attempting to send message...');
  console.log('Message content:', messageBody.substring(0, 100) + '...');
  console.log('');

  try {
    const result = await vonage.messages.send({
      from: fromNumber,
      to: toNumber,
      messageType: 'text',
      text: messageBody,
      channel: 'whatsapp'
    });

    console.log('✅ Message sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log('Error message:', error.message);
    console.log('Error status:', error.status);
    console.log('Error statusCode:', error.statusCode);
    console.log('');
    
    if (error.response) {
      console.log('📄 Response Details:');
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
      console.log('');
    }
    
    if (error.config) {
      console.log('🔧 Request Configuration:');
      console.log('URL:', error.config.url);
      console.log('Method:', error.config.method);
      console.log('Headers:', JSON.stringify(error.config.headers, null, 2));
      console.log('Data:', JSON.stringify(error.config.data, null, 2));
      console.log('');
    }
    
    console.log('💡 Common 422 Error Causes:');
    console.log('  1. From number is not a registered WhatsApp Business number');
    console.log('  2. To number is not registered in the Vonage WhatsApp sandbox');
    console.log('  3. Message content violates WhatsApp policies');
    console.log('  4. API credentials are incorrect or expired');
    console.log('  5. WhatsApp Business account is not properly configured');
    console.log('');
    
    console.log('🛠️  Recommended Actions:');
    console.log('  1. Verify your WhatsApp Business number is registered with Vonage');
    console.log('  2. Add test numbers to your Vonage WhatsApp sandbox');
    console.log('  3. Check Vonage dashboard for account status');
    console.log('  4. Verify API credentials in Vonage dashboard');
    console.log('  5. Check WhatsApp Business account approval status');
  }
}

// Run diagnosis
if (require.main === module) {
  diagnoseVonageError()
    .then(() => {
      console.log('\n✅ Diagnostic completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Diagnostic failed:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseVonageError };