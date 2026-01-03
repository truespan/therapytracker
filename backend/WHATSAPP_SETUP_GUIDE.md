# WhatsApp Notification Setup Guide

This guide will help you set up WhatsApp notifications for appointment confirmations in your TheraP Track system.

## Overview

The WhatsApp notification system automatically sends appointment confirmation messages to clients when:
1. Appointments are created by therapists
2. Clients book available slots through the availability system

## Architecture

```
Appointment Creation/Booking → WhatsApp Service → Vonage API → Client's WhatsApp
```

## Prerequisites

1. **Vonage Account**: Sign up at [https://dashboard.nexmo.com/sign-up](https://dashboard.nexmo.com/sign-up)
2. **WhatsApp Business Account**: Required for production use
3. **Verified Phone Number**: Your business phone number for WhatsApp

## Step-by-Step Setup

### Step 1: Create Vonage Account

1. Visit [https://dashboard.nexmo.com/sign-up](https://dashboard.nexmo.com/sign-up)
2. Sign up for a free account (includes trial credit)
3. Verify your email address
4. Complete the phone number verification

### Step 2: Get Vonage Credentials

1. Log in to your [Vonage Dashboard](https://dashboard.nexmo.com/)
2. Find your **API Key** and **API Secret** on the dashboard
3. Note down both credentials

### Step 3: Set Up WhatsApp Sandbox (For Testing)

1. In Vonage Dashboard, go to **Messages and Dispatch** > **Sandbox** > **WhatsApp**
2. Join your sandbox by sending the specified message to the sandbox number
3. Verify your own WhatsApp number for testing
4. Note the **Sandbox Number** (format: `14155238886`)

**⚠️ CRITICAL: Register Recipient Numbers**

Before you can send messages, you MUST register each recipient phone number in the sandbox:

1. In the WhatsApp Sandbox page, find **"Sandbox Recipients"** section
2. Click **"Add Number"**
3. Enter phone numbers in E.164 format **without the + sign**:
   - ✅ Correct: `919876543210` (India)
   - ✅ Correct: `14155238886` (USA)
   - ❌ Wrong: `+919876543210`
   - ❌ Wrong: `9876543210` (missing country code)
4. Add all phone numbers that will receive WhatsApp notifications
5. Click **"Save"**

**Important**: If you get "Invalid message type" (422 error), it means the recipient number is not registered in your sandbox!

### Step 4: Configure Environment Variables

Add these variables to your `.env.production` file:

```env
# WhatsApp Configuration (Vonage)
VONAGE_API_KEY=your_vonage_api_key_here
VONAGE_API_SECRET=your_vonage_api_secret_here
VONAGE_WHATSAPP_NUMBER=14155238886  # Your Vonage WhatsApp number (without whatsapp: prefix)
WHATSAPP_ENABLED=true  # Set to true to enable WhatsApp notifications
WHATSAPP_NOTIFICATION_TEMPLATE=appointment_confirmation
```

**Important Security Notes:**
- Never commit `.env.production` to version control
- Use strong, unique API credentials
- Rotate API secrets regularly
- Restrict Vonage API access to your server's IP address

### Step 5: Run Database Migration

Execute the migration to create/update the WhatsApp notifications table:

```bash
# Connect to your PostgreSQL database
psql -h your_host -U your_user -d your_database

# Run the initial migration (if not already applied)
\i backend/database/migrations/001_add_whatsapp_notifications.sql

# Run the Vonage update migration
\i backend/database/migrations/002_update_whatsapp_vonage.sql
```

Or use your database migration tool of choice.

### Step 6: Install Dependencies

```bash
cd backend
npm install @vonage/server-sdk
```

### Step 7: Test the Integration

Use the provided API endpoints to test your WhatsApp integration:

#### Test WhatsApp Service Status
```bash
GET /api/whatsapp/status
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Send Test Message
```bash
POST /api/whatsapp/test
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}
```

#### View Notification Logs
```bash
GET /api/whatsapp/logs?limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

## Production Setup

### Step 8: Apply for WhatsApp Business API

For production use, you need to apply for WhatsApp Business API:

1. In Vonage Dashboard, go to **Messages and Dispatch** > **Senders** > **WhatsApp Senders**
2. Click **Apply for WhatsApp Business API**
3. Provide required business information:
   - Business name and address
   - Business website
   - Business description
   - Facebook Business Manager ID (if available)
4. Submit for review (takes 1-3 business days)

### Step 9: Configure Your Business Number

Once approved:

1. Add your business phone number to Vonage
2. Verify the number via SMS or voice call
3. Update `VONAGE_WHATSAPP_NUMBER` in your environment variables
4. Format: `+919876543210` (include country code, without whatsapp: prefix)

### Step 10: Set Up Message Templates (Required for Production)

For production use, you MUST create and use approved message templates:

1. **Create Templates in WhatsApp Business Manager**:
   - Go to [Facebook Business Manager](https://business.facebook.com/)
   - Navigate to **WhatsApp Manager** > **Message Templates**
   - Click **Create Template**
   - Choose template category (e.g., "Appointment Update")
   - Create your template with placeholders (e.g., `{{1}}`, `{{2}}`, etc.)
   - Submit for approval (usually takes 1-2 hours)

2. **Get Template Details**:
   - Once approved, note down:
     - **Template Name**: e.g., `theraptrack_appointment_is_booked`
     - **Template Namespace**: Found in template details (e.g., `c0a5f8e8_a30e_41fd_9474_beea4345e9b5`)
     - **Template Language**: e.g., `en_US` for English (US)
     - **Parameter Count**: Number of placeholders in your template

3. **Configure Environment Variables**:
   ```env
   # WhatsApp Template Configuration
   WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5
   WHATSAPP_TEMPLATE_LOCALE=en_US
   WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
   WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED=theraptrack_appointment_cancelled
   WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER=theraptrack_appointment_reminder
   WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED=theraptrack_appointment_rescheduled
   WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false  # Set to true if template has 7 parameters
   ```

4. **Template Parameter Mapping**:
   
   **Default (6 parameters)**:
   - `{{1}}`: Client Name
   - `{{2}}`: Appointment Date
   - `{{3}}`: Appointment Time
   - `{{4}}`: Therapist Name
   - `{{5}}`: Appointment Type
   - `{{6}}`: Duration
   
   **With Payment Status (7 parameters)**:
   - `{{1}}`-`{{6}}`: Same as above
   - `{{7}}`: Payment Status (e.g., "Booking amount: INR 500.00" or "Booking made without payment")
   
   Set `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=true` if your template includes the 7th parameter.

**⚠️ CRITICAL: Error 1022 - Template Configuration Issues**

If you receive **Error 1022** (Template Rejected), it means one of the following:

1. **Namespace Mismatch**: You're not using your own template namespace
   - **Solution**: Set `WHATSAPP_TEMPLATE_NAMESPACE` to your namespace from WhatsApp Manager
   
2. **Locale Mismatch**: Template language doesn't match the locale in your API request
   - **Solution**: Set `WHATSAPP_TEMPLATE_LOCALE=en_US` (or your template's language code)
   - Common locales: `en_US`, `en_GB`, `hi` (Hindi), `es` (Spanish)
   
3. **Template Not Approved**: Template is pending or rejected
   - **Solution**: Check WhatsApp Manager for approval status
   
4. **Parameter Count Mismatch**: Sending wrong number of parameters
   - **Solution**: Verify parameter count matches your template
   - Use `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false` for 6 parameters (default)
   - Use `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=true` for 7 parameters

**Example Template (6 parameters)**:
```
🎉 *Appointment Confirmed!* 🎉

Hi {{1}},

Your therapy session has been successfully booked:

📅 *Date:* {{2}}
🕐 *Time:* {{3}}
👨‍⚕️ *Therapist:* {{4}}
🏥 *Type:* {{5}}
⏱️ *Duration:* {{6}}

Please arrive 5 minutes early for your session.

See you then! 😊
```

## Configuration Options

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VONAGE_API_KEY` | Yes | Your Vonage API Key | `12345678` |
| `VONAGE_API_SECRET` | Yes | Your Vonage API Secret | `AbCdEfGhIjKlMnOp` |
| `VONAGE_APPLICATION_ID` | Yes (Prod) | Vonage Application ID for JWT auth | `abcd1234-5678-90ef-ghij-klmnopqrstuv` |
| `VONAGE_PRIVATE_KEY` | Yes (Prod) | Vonage Private Key for JWT auth | `-----BEGIN PRIVATE KEY-----\n...` |
| `VONAGE_WHATSAPP_NUMBER` | Yes | Your Vonage WhatsApp number | `919655846492` |
| `WHATSAPP_ENABLED` | No | Enable/disable WhatsApp notifications | `true` or `false` (default: `false`) |
| `WHATSAPP_TEMPLATE_NAMESPACE` | Yes (Prod) | WhatsApp template namespace from Business Manager | `c0a5f8e8_a30e_41fd_9474_beea4345e9b5` |
| `WHATSAPP_TEMPLATE_LOCALE` | No | Template language/locale code | `en_US` (default), `en_GB`, `hi`, etc. |
| `WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED` | No | Template name for booking confirmation | `theraptrack_appointment_is_booked` |
| `WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED` | No | Template name for cancellation | `theraptrack_appointment_cancelled` |
| `WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER` | No | Template name for reminders | `theraptrack_appointment_reminder` |
| `WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED` | No | Template name for rescheduling | `theraptrack_appointment_rescheduled` |
| `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS` | No | Include payment status as 7th parameter | `true` or `false` (default: `false`) |

**Complete Production Configuration Example**:
```env
# Vonage Credentials
VONAGE_API_KEY=12345678
VONAGE_API_SECRET=AbCdEfGhIjKlMnOp
VONAGE_APPLICATION_ID=abcd1234-5678-90ef-ghij-klmnopqrstuv
VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
VONAGE_WHATSAPP_NUMBER=919655846492

# WhatsApp Configuration
WHATSAPP_ENABLED=true

# Template Configuration (REQUIRED for Production)
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5
WHATSAPP_TEMPLATE_LOCALE=en_US
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED=theraptrack_appointment_cancelled
WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER=theraptrack_appointment_reminder
WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED=theraptrack_appointment_rescheduled
WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false
```

### Feature Flags

The system includes several safety features:

- **Non-blocking**: WhatsApp failures don't affect appointment creation
- **Error logging**: All failures are logged for review
- **Phone validation**: Only valid phone numbers receive messages
- **Rate limiting**: Built-in protection against spam

## API Endpoints

### WhatsApp Management Endpoints

All endpoints require authentication and appropriate role permissions.

#### Get Service Status
```http
GET /api/whatsapp/status
```
**Response:**
```json
{
  "success": true,
  "service": {
    "enabled": true,
    "configured": true,
    "fromNumber": "+14155238886"
  },
  "statistics": {
    "sent": { "total": 45, "today": 3, "week": 18 },
    "failed": { "total": 2, "today": 0, "week": 1 }
  }
}
```

#### Test Integration
```http
POST /api/whatsapp/test
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}
```

#### Get Notification Logs
```http
GET /api/whatsapp/logs?status=failed&limit=20
```

**Query Parameters:**
- `userId` - Filter by user
- `appointmentId` - Filter by appointment
- `status` - Filter by status (sent, failed, delivered)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset
- `startDate` - Filter by start date
- `endDate` - Filter by end date

#### Resend Failed Notification
```http
POST /api/whatsapp/logs/123/resend
```

#### Get Statistics
```http
GET /api/whatsapp/statistics?days=30
```

## Troubleshooting

### Common Issues

#### 1. "WhatsApp service is disabled"
- Check `WHATSAPP_ENABLED=true` in environment variables
- Verify service initialization in logs

#### 2. "Invalid phone number format"
- Phone numbers must be in international format: `+919876543210`
- System auto-detects Indian numbers (10 digits → `+91` added)

#### 3. Vonage authentication errors
- Verify API Key and API Secret
- Check for extra spaces in environment variables
- Ensure credentials match your Vonage Dashboard

#### 4. "Invalid message type" (Status 422 Error)
**This is the most common sandbox issue!**

**Symptoms:**
- Error: `Request failed with status code 422`
- Error details: `Invalid message type` or `The 'message_type' parameter is invalid`
- Messages fail to send despite correct credentials

**Root Cause:**
The recipient phone number is NOT registered in your Vonage WhatsApp sandbox.

**Solution:**
1. Go to Vonage Dashboard → Messages and Dispatch → Sandbox → WhatsApp
2. Find "Sandbox Recipients" section
3. Add the recipient number in E.164 format WITHOUT + sign:
   - ✅ Correct: `919742991324`
   - ❌ Wrong: `+919742991324`
4. Save changes
5. Test again

**Quick Test:**
```bash
cd backend && node test_whatsapp_service.js
```

#### 5. Messages not being delivered
- Check Vonage message logs in dashboard
- Verify recipient joined sandbox (testing)
- Ensure business number is verified (production)

#### 6. High failure rate
- Validate phone numbers before sending
- Check for rate limiting
- Review Vonage account status and balance

#### 7. Error 1022: Template Rejected
**This is a template configuration issue!**

**Symptoms:**
- Error: `Request failed with status code 422`
- Vonage Dashboard shows: "Rejected" with error code 1022
- Messages fail even though template is approved

**Root Causes and Solutions:**

**A. Namespace Mismatch**
- **Problem**: Using a template from a different WhatsApp Business Account
- **Check**: Go to WhatsApp Manager → Message Templates → Click your template → Note the "Message Template Namespace"
- **Solution**: Set `WHATSAPP_TEMPLATE_NAMESPACE` to your namespace (e.g., `c0a5f8e8_a30e_41fd_9474_beea4345e9b5`)

**B. Locale/Language Mismatch**
- **Problem**: Template language doesn't match the locale in API request
- **Check**: In WhatsApp Manager, check your template's language (e.g., "English (US)")
- **Solution**: Set `WHATSAPP_TEMPLATE_LOCALE` to match:
  - English (US) → `en_US` (default)
  - English (UK) → `en_GB`
  - Hindi → `hi`
  - Spanish → `es`
- **Common mistake**: Using `en` instead of `en_US`

**C. Template Not Approved**
- **Problem**: Template is pending approval or was rejected
- **Check**: WhatsApp Manager → Message Templates → Check status
- **Solution**: Wait for approval or fix rejection issues

**D. Parameter Count Mismatch**
- **Problem**: Sending wrong number of parameters to template
- **Check**: Count placeholders in your template (e.g., `{{1}}`, `{{2}}`, etc.)
- **Solution**: 
  - If template has 6 parameters: `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false`
  - If template has 7 parameters: `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=true`

**Quick Diagnostic Steps:**
1. Check Vonage Dashboard → Messages → Find the rejected message ID
2. Look at the error details for specific cause
3. Verify all template configuration in `.env`:
   ```bash
   # Check current configuration
   grep WHATSAPP_TEMPLATE .env.production
   ```
4. Compare with WhatsApp Manager template details
5. Update mismatched values and restart service

**Example Fix:**
```env
# Before (causing error 1022)
WHATSAPP_TEMPLATE_LOCALE=en  # ❌ Wrong!

# After (fixed)
WHATSAPP_TEMPLATE_LOCALE=en_US  # ✅ Correct!
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5  # ✅ Added namespace
```

### Testing Checklist

- [ ] Environment variables configured
- [ ] Vonage credentials valid
- [ ] Database migration applied
- [ ] Test message sends successfully
- [ ] Appointment creation triggers notification
- [ ] Slot booking triggers notification
- [ ] Failed notifications are logged
- [ ] Error handling works correctly
- [ ] Phone validation works for Indian numbers
- [ ] Non-blocking behavior confirmed

## Quick Test Commands

### Test WhatsApp Service Status
```bash
cd backend
node test_whatsapp_service.js
```

### Test with Specific Phone Number
```bash
cd backend
node -e "
const service = require('./src/services/whatsappService');
service.testIntegration('+919876543210').then(console.log).catch(console.error);
"
```

### Check Vonage Account Balance
```bash
cd backend
node diagnose_vonage_detailed.js
```

### Run Full Diagnostic
```bash
cd backend
node diagnose_vonage_error.js
```

### Expected Test Results

**Successful Test Output:**
```
=== Testing Updated WhatsApp Service ===

Test 1: Service Status
Status: {
  "enabled": true,
  "configured": true,
  "fromNumber": "+14157386102"
}

Test 2: Configuration Validation
Validation: {
  "valid": true,
  "errors": [],
  "warnings": []
}

Test 3: Integration Test
Testing with phone: +919876543210
✅ Test message sent successfully!
Message ID: 934b71f9-5786-4b00-9011-3d8173c9d7a1
Phone: +919876543210

Test 4: Appointment Message Creation
Generated message:
🎉 *Appointment Confirmed!* 🎉
...

=== Test Complete ===
```

**If You See 422 Error:**
```
❌ Test failed: Request failed with status code 422
🔧 SANDBOX REGISTRATION REQUIRED!
The recipient number is not registered in your Vonage WhatsApp sandbox.

To fix this:
1. Go to https://dashboard.nexmo.com/
2. Navigate to: Messages and Dispatch > Sandbox > WhatsApp
3. Add the following number to sandbox recipients: +919876543210
4. Make sure the number follows the sandbox format (e.g., 919876543210)
5. Save changes and try again
```

## Integration Testing

### Test Appointment Creation Flow
1. Create a new appointment in the system
2. Check that WhatsApp notification is triggered
3. Verify notification appears in logs: `GET /api/whatsapp/logs`
4. Confirm message delivery in Vonage dashboard

### Test Slot Booking Flow
1. Book an available slot as a client
2. Verify WhatsApp confirmation is sent
3. Check logs for successful delivery

### Test Error Scenarios
1. Try with invalid phone number format
2. Test with non-registered sandbox number
3. Verify errors are logged but don't block operations

## Monitoring and Maintenance

### Daily Monitoring

Check these metrics daily:
- Message delivery rate (target: >95%)
- Failure rate (target: <5%)
- Vonage account balance
- Error logs for patterns

### Weekly Tasks

- Review failed notifications and resend if needed
- Check phone number validation issues
- Monitor costs and usage
- Update message templates if needed

### Monthly Tasks

- Analyze notification statistics
- Review and update Vonage credentials
- Check for WhatsApp API changes
- Optimize message content based on feedback

## Security Best Practices

1. **Credential Management**
   - Store credentials in environment variables
   - Never commit credentials to Git
   - Use different credentials for dev/staging/production
   - Rotate API secrets regularly

2. **Phone Number Privacy**
   - Encrypt phone numbers in logs
   - Only store last 4 digits in error messages
   - Comply with data protection regulations
   - Implement opt-out mechanism

3. **API Security**
   - Restrict Vonage API to server IP addresses
   - Use webhook signature validation
   - Implement rate limiting
   - Monitor for suspicious activity

## Cost Management

### Vonage WhatsApp Pricing (India)

- **Per-message cost**: ~$0.01 USD
- **Monthly volume**: Based on appointment volume
- **Sandbox**: Free for testing

### Cost Optimization Tips

1. **Validate phone numbers** before sending
2. **Batch notifications** where possible
3. **Monitor usage** and set alerts
4. **Use templates** for high-volume messages
5. **Implement opt-in** to avoid unnecessary messages

### Example Cost Calculation

If you send 100 appointment confirmations per month:
- Cost: 100 × $0.01 = $1.00 USD per month
- Annual cost: ~$12 USD

## Support and Resources

### Vonage Resources
- [Vonage Messages API Documentation](https://developer.vonage.com/messages)
- [Vonage Dashboard](https://dashboard.nexmo.com/)
- [WhatsApp Pricing](https://www.vonage.com/communications-apis/messages/pricing/)

### TheraP Track Support
- Check application logs: `docker logs` or `pm2 logs`
- Review notification logs: `/api/whatsapp/logs`
- Test integration: `/api/whatsapp/test`

## Migration from Twilio

If you're migrating from Twilio to Vonage:

1. **Update environment variables** from Twilio to Vonage credentials
2. **Run database migration** to update message ID column
3. **Test with small batch** before full migration
4. **Monitor delivery rates** during transition
5. **Update any custom integrations** to use Vonage API format

## Future Enhancements

Planned features for future releases:

- [ ] Reminder messages (24h, 1h before appointment)
- [ ] Two-way communication (confirm/cancel via WhatsApp)
- [ ] Rich media messages (therapist photos, location maps)
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Message templates for different appointment types
- [ ] Analytics dashboard for notification metrics
- [ ] Client opt-in/opt-out management
- [ ] Integration with other messaging platforms

## Conclusion

WhatsApp notifications provide a reliable, cost-effective way to keep clients informed about their appointments. With proper setup and monitoring, you can achieve high delivery rates and improve client satisfaction.

For questions or support, please refer to the troubleshooting section or contact your system administrator.