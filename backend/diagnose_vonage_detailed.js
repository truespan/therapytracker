const { Vonage } = require('@vonage/server-sdk');
const axios = require('axios');
require('dotenv').config();

async function diagnoseVonageIssue() {
  console.log('=== Vonage WhatsApp Diagnostic ===\n');
  
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_WHATSAPP_NUMBER;
  const testPhone = '+919742991324';
  
  console.log('Configuration Check:');
  console.log('- API Key present:', !!apiKey);
  console.log('- API Secret present:', !!apiSecret);
  console.log('- From Number:', fromNumber);
  console.log('- Test Phone:', testPhone);
  console.log('- WhatsApp Enabled:', process.env.WHATSAPP_ENABLED);
  
  if (!apiKey || !apiSecret || !fromNumber) {
    console.error('\n❌ Missing required configuration');
    return;
  }
  
  // Test 1: Check Vonage account balance (validates credentials)
  console.log('\n--- Test 1: Checking Vonage Account Balance ---');
  try {
    const balanceResponse = await axios.get(
      `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`
    );
    console.log('✅ Credentials valid - Account balance:', balanceResponse.data.value, balanceResponse.data.autoReload);
  } catch (error) {
    console.log('❌ Credential validation failed:', error.response?.data || error.message);
  }
  
  // Test 2: Check WhatsApp sandbox status
  console.log('\n--- Test 2: Checking WhatsApp Sandbox Status ---');
  try {
    const vonage = new Vonage({ apiKey, apiSecret });
    
    // Try to send with detailed error capture
    const messageBody = '🧪 TheraP Track WhatsApp Test';
    
    console.log('Attempting to send message...');
    console.log('From:', fromNumber);
    console.log('To:', testPhone);
    
    try {
      const result = await vonage.messages.send({
        from: { type: 'whatsapp', number: fromNumber },
        to: { type: 'whatsapp', number: testPhone },
        message: {
          content: {
            type: 'text',
            text: messageBody
          }
        }
      });
      console.log('✅ Message sent successfully:', result);
    } catch (sendError) {
      console.log('❌ Send failed with details:');
      console.log('Error message:', sendError.message);
      console.log('Error status:', sendError.status);
      console.log('Error statusCode:', sendError.statusCode);
      console.log('Full error object:', JSON.stringify(sendError, null, 2));
      
      if (sendError.response) {
        console.log('Response data:', sendError.response.data);
        console.log('Response status:', sendError.response.status);
        console.log('Response headers:', sendError.response.headers);
      }
    }
    
  } catch (error) {
    console.log('❌ Vonage initialization failed:', error.message);
  }
  
  // Test 3: Direct API call with axios for more control
  console.log('\n--- Test 3: Direct API Call ---');
  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    const requestData = {
      from: { type: 'whatsapp', number: fromNumber },
      to: { type: 'whatsapp', number: testPhone },
      message: {
        content: {
          type: 'text',
          text: '🧪 Direct API Test'
        }
      }
    };
    
    console.log('Request payload:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(
      'https://messages-sandbox.nexmo.com/v1/messages',
      requestData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Direct API call succeeded:', response.data);
  } catch (error) {
    console.log('❌ Direct API call failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else {
      console.log('Error:', error.message);
    }
  }
  
  console.log('\n=== Diagnostic Complete ===');
}

diagnoseVonageIssue().catch(console.error);