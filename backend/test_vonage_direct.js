require('dotenv').config();
const axios = require('axios');

async function testVonageDirect() {
  console.log('=== Testing Vonage API Directly ===\n');
  
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_WHATSAPP_NUMBER;
  const toNumber = '919742991324'; // Your test number without +
  
  console.log('Configuration:');
  console.log('- API Key:', apiKey);
  console.log('- From Number:', fromNumber);
  console.log('- To Number:', toNumber);
  console.log('- Sandbox Mode:', process.env.VONAGE_SANDBOX === 'true');
  
  // Test with sandbox endpoint
  const sandboxUrl = 'https://messages-sandbox.nexmo.com/v1/messages';
  const productionUrl = 'https://api.nexmo.com/v1/messages';
  
  const url = process.env.VONAGE_SANDBOX === 'true' ? sandboxUrl : productionUrl;
  
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  
  const payload = {
    from: fromNumber.startsWith('+') ? fromNumber.substring(1) : fromNumber,
    to: toNumber,
    channel: 'whatsapp',
    message_type: 'text',
    text: '🧪 Direct API Test: This is a test message from Vonage API'
  };
  
  console.log('\nRequest URL:', url);
  console.log('Request Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    });
    
    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Error!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testVonageDirect().catch(console.error);