# WhatsApp Sandbox Registration Fix

## Problem Identified

The error `422 - Invalid message type` indicates that the recipient phone number is **not registered** in your Vonage WhatsApp sandbox.

## Root Cause

When using Vonage's WhatsApp API in sandbox mode, you can only send messages to phone numbers that have been pre-registered in the sandbox. Your number `+919742991324` needs to be added to the sandbox recipients list.

## Solution: Register Your Number in Vonage Sandbox

### Step-by-Step Fix

#### 1. Access Vonage Dashboard
- Go to [https://dashboard.nexmo.com/](https://dashboard.nexmo.com/)
- Log in with your Vonage credentials

#### 2. Navigate to WhatsApp Sandbox
- In the left sidebar, go to **"Messages and Dispatch"**
- Click on **"Sandbox"**
- Select the **"WhatsApp"** tab

#### 3. Add Your Phone Number
- Look for **"Sandbox Recipients"** or **"To Numbers"** section
- Click **"Add Number"** or **"+"** button
- Enter your phone number in the correct format: `919742991324`
  - **Important**: Remove the `+` sign and any spaces
  - Use format: `91` (country code) + `9742991324` (number)
  - Final format: `919742991324`

#### 4. Verify Number Format
The number should be in **E.164 format without the + sign**:
- ✅ Correct: `919742991324`
- ❌ Wrong: `+919742991324`
- ❌ Wrong: `09742991324`
- ❌ Wrong: `9742991324` (missing country code)

#### 5. Save Configuration
- Click **"Save"** or **"Add to Sandbox"**
- Wait for confirmation that the number was added successfully

#### 6. Test Again
Run the test again to verify the fix:
```bash
cd backend && node test_whatsapp_service.js
```

## Alternative: Use Sandbox Join Command

If the above doesn't work, try joining the sandbox via WhatsApp:

1. Open WhatsApp on your phone
2. Send a message to the sandbox number `+14157386102`
3. The message should be: `JOIN THERAPTRACK`
4. Wait for confirmation
5. Try the test again

## Verification Checklist

- [ ] Logged into Vonage Dashboard
- [ ] Navigated to Messages and Dispatch > Sandbox > WhatsApp
- [ ] Found the Sandbox Recipients section
- [ ] Added number `919742991324` (without + sign)
- [ ] Saved the configuration
- [ ] Re-run test with `node test_whatsapp_service.js`

## Expected Success Output

When successful, you should see:
```
✅ Test message sent successfully!
Message ID: <some-uuid>
Phone: +919742991324
```

## Troubleshooting

### If you still get 422 error:

1. **Check Number Format**: Ensure you're using `919742991324` not `+919742991324`
2. **Verify Sandbox Status**: Make sure your Vonage account is in sandbox mode
3. **Check API Credentials**: Verify `VONAGE_API_KEY` and `VONAGE_API_SECRET` in your `.env` file
4. **Account Balance**: Ensure you have sufficient balance in your Vonage account

### If you get authentication errors:

1. Verify your API key and secret in the Vonage dashboard
2. Check for extra spaces in your `.env` file
3. Ensure credentials match exactly what's in the dashboard

### If you get "Invalid from number":

1. Verify `VONAGE_WHATSAPP_NUMBER=+14157386102` in your `.env` file
2. Ensure the number includes the `+` sign
3. Check that this matches your sandbox number in Vonage dashboard

## Production Considerations

When moving to production:

1. **Apply for WhatsApp Business API** through Vonage
2. **Verify your business number** (different from sandbox)
3. **Update environment variables** with production credentials
4. **Test thoroughly** before going live

## Quick Test Commands

```bash
# Test WhatsApp service status
cd backend && node test_whatsapp_service.js

# Test with specific number
cd backend && node -e "
const service = require('./src/services/whatsappService');
service.testIntegration('+919742991324').then(console.log).catch(console.error);
"

# Check Vonage account balance
cd backend && node diagnose_vonage_detailed.js
```

## Support

If you continue to have issues:

1. Check the [Vonage Messages API Documentation](https://developer.vonage.com/messages)
2. Review your Vonage dashboard for any alerts or notifications
3. Verify your sandbox setup matches the requirements
4. Check application logs for detailed error messages

## Summary

The 422 error is **not** a code issue - it's a configuration issue. Your code is correct, but the recipient number needs to be registered in the Vonage WhatsApp sandbox before messages can be sent.

**Key Points:**
- ✅ Code is working correctly
- ✅ Vonage credentials are valid
- ✅ WhatsApp service is properly initialized
- ❌ Recipient number not in sandbox (this is the issue)
- 🔧 Fix: Add `919742991324` to sandbox recipients

Once you register the number in the sandbox, the WhatsApp notifications will work perfectly!