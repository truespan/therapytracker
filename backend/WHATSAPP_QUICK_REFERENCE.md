# WhatsApp Notifications - Quick Reference

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install @vonage/server-sdk
```

### 2. Configure Environment Variables
Add to `.env.production`:
```env
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_WHATSAPP_NUMBER=+14157386102
WHATSAPP_ENABLED=true
```

### 3. Run Database Migration
```bash
psql -h your_host -U your_user -d your_database -f backend/database/migrations/002_update_whatsapp_vonage.sql
```

### 4. Test the Integration
```bash
# Start your server
npm run dev

# Test WhatsApp (requires valid JWT token)
curl -X POST http://localhost:5000/api/whatsapp/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/whatsapp/status` | Get service status | Yes (Admin/Org) |
| POST | `/api/whatsapp/test` | Send test message | Yes (Admin/Org) |
| GET | `/api/whatsapp/logs` | View notification logs | Yes (Admin/Org) |
| GET | `/api/whatsapp/logs/:id` | Get specific log | Yes (Admin/Org) |
| POST | `/api/whatsapp/logs/:id/resend` | Resend failed message | Yes (Admin/Org) |
| GET | `/api/whatsapp/statistics` | Get usage stats | Yes (Admin/Org) |

## Phone Number Formats

✅ **Valid Formats:**
- `+919876543210` (International format - RECOMMENDED)
- `9876543210` (Auto-detects as +91)
- `+1 (555) 123-4567` (Formatted - cleaned automatically)

❌ **Invalid Formats:**
- `987654321` (Too short)
- `++919876543210` (Double +)
- `abc123` (Non-numeric)

## Message Template

Clients receive:

```
🎉 *Appointment Confirmed!* 🎉

Hi [Client Name],

Your therapy session has been successfully booked:

📅 *Date:* Monday, January 15, 2024
🕐 *Time:* 10:30 AM (IST)
👨‍⚕️ *Therapist:* Dr. Smith
🏥 *Type:* Therapy Session - Online
⏱️ *Duration:* 60 minutes

Please arrive 5 minutes early for your session.

If you need to reschedule or have any questions, please contact your therapist.

See you then! 😊

- *TheraP Track Team*
```

## Troubleshooting

### Service Not Working?
1. Check logs: `GET /api/whatsapp/status`
2. Verify credentials in environment variables
3. Test with: `POST /api/whatsapp/test`
4. Check database migration applied

### Messages Not Sending?
1. Verify phone number format
2. Check Vonage account balance
3. Review Vonage dashboard logs
4. Ensure `WHATSAPP_ENABLED=true`

### High Failure Rate?
1. Validate phone numbers in database
2. Check for rate limiting
3. Review error logs: `GET /api/whatsapp/logs?status=failed`
4. Test with known good numbers

## Cost Estimate

**India Pricing:** ~$0.01 USD per message

**Monthly Estimate:**
- 100 appointments/month = $1.00/month
- 500 appointments/month = $5.00/month
- 1000 appointments/month = $10.00/month

## Integration Points

WhatsApp notifications are automatically triggered when:

1. **Appointment Created** (`POST /api/appointments`)
2. **Slot Booked** (`POST /api/availability-slots/:id/book`)

**Note:** Notifications are non-blocking. Appointment creation/booking succeeds even if WhatsApp fails.

## Monitoring

### Daily Checks
```bash
# Service status
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/whatsapp/status

# Recent failures
curl -H "Authorization: Bearer TOKEN" "http://localhost:5000/api/whatsapp/logs?status=failed&limit=10"

# Statistics
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/whatsapp/statistics?days=7
```

### Key Metrics
- Delivery rate: >95% ✅
- Failure rate: <5% ✅
- Response time: <2 seconds ✅

## Common Issues

| Issue | Solution |
|-------|----------|
| "Service disabled" | Set `WHATSAPP_ENABLED=true` |
| "Invalid phone format" | Use +91XXXXXXXXXX format |
| "Auth failed" | Check Vonage credentials |
| "Not delivered" | Check Vonage balance |
| "High failure rate" | Validate phone numbers |

## Support

- **Full Guide**: See [WHATSAPP_SETUP_GUIDE.md](WHATSAPP_SETUP_GUIDE.md)
- **Implementation Plan**: See [plans/whatsapp-notification-implementation.md](plans/whatsapp-notification-implementation.md)
- **Vonage Docs**: https://developer.vonage.com/messages
- **Test Endpoint**: `POST /api/whatsapp/test`

## Quick Test Script

```javascript
// test-whatsapp.js
const axios = require('axios');

async function testWhatsApp() {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/whatsapp/test',
      { phoneNumber: '+919876543210' },
      { headers: { 'Authorization': 'Bearer YOUR_JWT_TOKEN' }}
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

testWhatsApp();
```

Run: `node test-whatsapp.js`

## Migration from Twilio

If migrating from Twilio:

1. Update environment variables:
   - `TWILIO_ACCOUNT_SID` → `VONAGE_API_KEY`
   - `TWILIO_AUTH_TOKEN` → `VONAGE_API_SECRET`
   - `TWILIO_WHATSAPP_NUMBER` → `VONAGE_WHATSAPP_NUMBER`

2. Run migration:
```bash
psql -h your_host -U your_user -d your_database -f backend/database/migrations/002_update_whatsapp_vonage.sql
```

3. Update code references from `messageSid` to `messageId`

4. Test integration before production use