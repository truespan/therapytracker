const { Vonage } = require('@vonage/server-sdk');
require('dotenv').config();

async function testVonageFormats() {
  console.log('Testing Vonage API formats...\n');
  
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_WHATSAPP_NUMBER;
  const testPhone = '+919742991324'; // Your test number
  
  if (!apiKey || !apiSecret || !fromNumber) {
    console.error('Missing Vonage configuration');
    return;
  }
  
  const vonage = new Vonage({
    apiKey,
    apiSecret
  });
  
  const messageBody = '🧪 *TheraP Track WhatsApp Test*\n\nThis is a test message from your TheraP Track system. If you received this, your WhatsApp integration is working correctly! ✅';
  
  // Test 1: Current format (likely failing)
  console.log('Test 1: Current format (OLD/INCORRECT)');
  try {
    const result1 = await vonage.messages.send({
      from: fromNumber,
      to: testPhone,
      messageType: 'text',
      text: messageBody,
      channel: 'whatsapp'
    });
    console.log('✅ Success:', result1);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    console.log('Status:', error.status);
    console.log('Response:', error.response?.data);
  }
  
  console.log('\n---\n');
  
  // Test 2: Correct Vonage Messages API format
  console.log('Test 2: Correct Vonage Messages API format');
  try {
    const result2 = await vonage.messages.send({
      from: { type: 'whatsapp', number: fromNumber },
      to: { type: 'whatsapp', number: testPhone },
      message: {
        content: {
          type: 'text',
          text: messageBody
        }
      }
    });
    console.log('✅ Success:', result2);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    console.log('Status:', error.status);
    console.log('Response:', error.response?.data);
  }
  
  console.log('\n---\n');
  
  // Test 3: Alternative format (some SDK versions)
  console.log('Test 3: Alternative format');
  try {
    const result3 = await vonage.messages.send({
      from: fromNumber,
      to: testPhone,
      text: messageBody,
      message_type: 'text',
      channel: 'whatsapp'
    });
    console.log('✅ Success:', result3);
  } catch (error) {
    console.log('❌ Failed:', error.message);
    console.log('Status:', error.status);
    console.log('Response:', error.response?.data);
  }
}

testVonageFormats().catch(console.error);