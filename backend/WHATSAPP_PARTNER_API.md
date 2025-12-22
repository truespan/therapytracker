# WhatsApp Partner Messaging API

This document describes the WhatsApp messaging feature for Partners in TheraPTrack-controlled organizations.

## Overview

Partners who belong to organizations with `theraptrack_controlled` set to `true` can send WhatsApp messages to their assigned clients. This feature uses the Vonage WhatsApp Business API for message delivery.

## Prerequisites

1. Organization must have `theraptrack_controlled = true`
2. WhatsApp service must be enabled and configured (see [WHATSAPP_SETUP_GUIDE.md](WHATSAPP_SETUP_GUIDE.md))
3. Partner must be authenticated and have the 'partner' role
4. Client must have a valid phone number
5. Client must be assigned to the partner

## API Endpoints

### Partner Endpoints

#### Get Partner WhatsApp Status

Check if WhatsApp messaging is available for the partner.

```
GET /api/partners/whatsapp/status
```

**Authentication**: Required (JWT token)

**Role Required**: `partner`

**Response**:
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "configured": true,
    "fromNumber": "+1234567890",
    "partnerAccess": true,
    "reason": "enabled",
    "organizationId": 1
  }
}
```

**Access Control**: Returns `403 Forbidden` if organization is not TheraPTrack controlled.

---

#### Send WhatsApp Message to Client

Send a custom WhatsApp message to an assigned client.

```
POST /api/partners/whatsapp/send
```

**Authentication**: Required (JWT token)

**Role Required**: `partner`

**Request Body**:
```json
{
  "userId": 123,
  "message": "Hello! This is a reminder about your upcoming session.",
  "messageType": "general_message"
}
```

**Parameters**:
- `userId` (required): ID of the client/user to message
- `message` (required): The message content to send
- `messageType` (optional): Type of message (default: 'general_message')

**Response**:
```json
{
  "success": true,
  "message": "WhatsApp message sent successfully",
  "messageId": "message-uuid",
  "phoneNumber": "+919876543210"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields or user doesn't have phone number
- `403 Forbidden`: User not assigned to partner or organization not TheraPTrack controlled
- `404 Not Found`: User not found

**Message Format**: Messages are automatically formatted with:
```
📱 *Message from [Partner Name]* 📱

Hi [Client Name],

[Your message content]

— [Partner Name]
```

---

#### Get Partner WhatsApp Logs

Retrieve WhatsApp message logs for the partner's clients.

```
GET /api/partners/whatsapp/logs
```

**Authentication**: Required (JWT token)

**Role Required**: `partner`

**Query Parameters**:
- `userId` (optional): Filter by specific client
- `status` (optional): Filter by status ('sent', 'failed', 'pending')
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)
- `limit` (optional): Number of records per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "partner_id": 45,
      "user_id": 123,
      "phone_number": "+919876543210",
      "message_type": "general_message",
      "status": "sent",
      "vonage_message_id": "message-uuid",
      "error_message": null,
      "sent_at": "2025-12-22T10:30:00Z",
      "created_at": "2025-12-22T10:30:00Z",
      "user_name": "John Doe",
      "user_phone": "+919876543210"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Existing Admin/Organization Endpoints

The following endpoints remain available for admin and organization users:

- `GET /api/whatsapp/status` - Get overall WhatsApp service status
- `POST /api/whatsapp/test` - Test WhatsApp integration
- `GET /api/whatsapp/logs` - Get all WhatsApp logs (admin/organization only)
- `GET /api/whatsapp/logs/:id` - Get specific notification details
- `POST /api/whatsapp/logs/:id/resend` - Resend failed notification
- `GET /api/whatsapp/statistics` - Get WhatsApp usage statistics

## Database Schema

### whatsapp_notifications Table

The `whatsapp_notifications` table has been extended to support partner messaging:

```sql
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,  -- NEW
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    vonage_message_id VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**New Column**:
- `partner_id`: References the partner who sent the message (for partner-to-client messaging)

**Message Types**:
- `appointment_confirmation`: Automatic appointment confirmations
- `general_message`: Custom messages from partners
- Other custom types can be added as needed

## Access Control

### Middleware

The feature uses several middleware components:

1. **`authenticateToken`**: Validates JWT authentication
2. **`checkRole('partner')`**: Ensures user has partner role
3. **`checkWhatsAppAccessMiddleware`**: Checks if partner's organization has `theraptrack_controlled = true`

### Access Requirements

- **Partner Access**: Partners can only send messages to clients assigned to them
- **Organization Control**: Only partners in TheraPTrack-controlled organizations can use this feature
- **Phone Validation**: Recipients must have valid phone numbers in international format

## Error Handling

### Common Errors

1. **Organization Not Controlled**:
   ```json
   {
     "error": "WhatsApp messaging is only available for TheraPTrack controlled organizations",
     "featureDisabled": true,
     "reason": "organization_not_controlled"
   }
   ```

2. **User Not Assigned**:
   ```json
   {
     "error": "User is not assigned to this partner",
     "success": false
   }
   ```

3. **Invalid Phone Number**:
   ```json
   {
     "error": "User does not have a phone number",
     "success": false
   }
   ```

4. **Service Disabled**:
   ```json
   {
     "error": "WhatsApp service is disabled",
     "success": false
   }
   ```

## Usage Examples

### Example 1: Send a Reminder Message

```javascript
const response = await fetch('/api/partners/whatsapp/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 123,
    message: "Reminder: Your therapy session is scheduled for tomorrow at 2 PM.",
    messageType: "appointment_reminder"
  })
});

const result = await response.json();
console.log(result); // { success: true, messageId: "..." }
```

### Example 2: Check Service Status

```javascript
const response = await fetch('/api/partners/whatsapp/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const status = await response.json();
if (status.status.partnerAccess) {
  console.log('WhatsApp messaging is available');
}
```

### Example 3: Get Message Logs

```javascript
const response = await fetch('/api/partners/whatsapp/logs?limit=10&status=sent', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const logs = await response.json();
console.log(`Sent ${logs.logs.length} messages`);
```

## Setup Requirements

### Environment Variables

Ensure these environment variables are set:

```env
WHATSAPP_ENABLED=true
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_WHATSAPP_NUMBER=your_whatsapp_number
```

### Database Migration

Run the migration to add `partner_id` column:

```bash
psql -d your_database -f database/migrations/003_add_partner_id_to_whatsapp_notifications.sql
```

## Security Considerations

1. **Message Content**: Messages are logged for compliance and monitoring
2. **Access Control**: Partners can only message their assigned clients
3. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
4. **Data Privacy**: Ensure compliance with data protection regulations
5. **Audit Trail**: All messages are logged with sender, recipient, and timestamp

## Monitoring

### Key Metrics

- Message delivery rates
- Failed message rates
- Response times
- Partner usage statistics

### Log Analysis

Use the logs endpoint to monitor:

```bash
# Get failed messages
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/partners/whatsapp/logs?status=failed"

# Get messages for specific client
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/partners/whatsapp/logs?userId=123"
```

## Troubleshooting

### Common Issues

1. **Messages Not Sending**
   - Check WhatsApp service status
   - Verify phone number format
   - Check Vonage API credentials
   - Review error logs

2. **Access Denied**
   - Verify organization has `theraptrack_controlled = true`
   - Check partner role assignment
   - Ensure user is assigned to partner

3. **Delivery Failures**
   - Check recipient phone number validity
   - Verify WhatsApp Business API limits
   - Review Vonage account status

### Support

For technical issues, check:
- [WHATSAPP_SETUP_GUIDE.md](WHATSAPP_SETUP_GUIDE.md) - Setup and configuration
- Application logs for error details
- Vonage API dashboard for message status

## Future Enhancements

Potential improvements:

1. **Message Templates**: Pre-approved message templates for common scenarios
2. **Scheduled Messages**: Schedule messages for future delivery
3. **Message Replies**: Handle client replies to partner messages
4. **Media Messages**: Support for images, documents, and voice messages
5. **Message Analytics**: Detailed analytics and reporting
6. **Bulk Messaging**: Send messages to multiple clients (with safeguards)