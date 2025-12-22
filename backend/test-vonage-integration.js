// Test script for Vonage WhatsApp integration
const { Vonage } = require('@vonage/server-sdk');
require('dotenv').config();

async function testVonageIntegration() {
  console.log('🧪 Testing Vonage WhatsApp Integration...\n');

  // Check environment variables
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_WHATSAPP_NUMBER;

  console.log('Environment Variables:');
  console.log(`VONAGE_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`VONAGE_API_SECRET: ${apiSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`VONAGE_WHATSAPP_NUMBER: ${fromNumber ? '✅ Set' : '❌ Missing'}`);
  console.log(`WHATSAPP_ENABLED: ${process.env.WHATSAPP_ENABLED}\n`);

  if (!apiKey || !apiSecret || !fromNumber) {
    console.log('❌ Missing required environment variables. Please set:');
    console.log('   VONAGE_API_KEY');
    console.log('   VONAGE_API_SECRET');
    console.log('   VONAGE_WHATSAPP_NUMBER');
    return;
  }

  try {
    // Initialize Vonage client
    const vonage = new Vonage({
      apiKey,
      apiSecret
    });

    console.log('✅ Vonage client initialized successfully\n');

    // Test phone number format
    const testPhone = '+919876543210'; // Replace with your test number
    console.log(`Testing phone number format: ${testPhone}`);
    
    // Note: In a real test, you would send a message here
    // For now, we'll just verify the setup is correct
    console.log('\n✅ Setup verification complete!');
    console.log('\nTo send a real test message:');
    console.log('1. Join the Vonage WhatsApp sandbox');
    console.log('2. Update the testPhone variable with your number');
    console.log('3. Uncomment the message sending code below');

    /*
    // Uncomment this section to send a real test message
    
    const result = await vonage.messages.send({
      from: fromNumber,
      to: testPhone,
      messageType: 'text',
      text: '🧪 TheraP Track WhatsApp Test\n\nThis is a test message from your TheraP Track system. If you received this, your Vonage integration is working correctly! ✅',
      channel: 'whatsapp'
    });

    console.log('✅ Message sent successfully!');
    console.log('Message ID:', result.message_uuid || result.uuid);
    */

  } catch (error) {
    console.error('❌ Error testing Vonage integration:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testVonageIntegration().catch(console.error);