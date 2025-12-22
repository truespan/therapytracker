# WhatsApp Notification Implementation Plan

## Overview
Implement WhatsApp notifications for clients when appointments are booked in the TheraP Track system.

## Architecture Design

### WhatsApp Service Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Appointment     │     │ WhatsApp Service │     │ Twilio API      │
│ Controllers     │────▶│                  │────▶│ for WhatsApp    │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │ Logging &        │
                        │ Error Handling   │
                        └──────────────────┘
```

### Integration Points
1. **Appointment Creation** - [`appointmentController.createAppointment()`](backend/src/controllers/appointmentController.js:4)
2. **Slot Booking** - [`availabilitySlotController.bookSlot()`](backend/src/controllers/availabilitySlotController.js:371)
3. **User Model** - Phone numbers stored in [`users.contact`](backend/src/models/User.js:5)

## Implementation Steps

### Phase 1: Setup and Configuration
1. **Choose WhatsApp API Provider**
   - **Recommended**: Twilio API for WhatsApp
   - **Why**: Excellent India support, reliable, good documentation
   - **Alternative**: Vonage (if Twilio unavailable)

2. **Environment Configuration**
   - Add to [`.env.production.example`](backend/.env.production.example):
   ```env
   # WhatsApp Configuration (Twilio)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Twilio sandbox number
   WHATSAPP_ENABLED=true
   WHATSAPP_NOTIFICATION_TEMPLATE=appointment_confirmation
   ```

3. **Install Dependencies**
   ```bash
   npm install twilio
   ```

### Phase 2: Core Service Development

1. **Create WhatsApp Service Module**
   - File: [`backend/src/services/whatsappService.js`](backend/src/services/whatsappService.js)
   - Functions:
     - `sendAppointmentConfirmation(userPhone, appointmentDetails)`
     - `formatPhoneNumber(phone)`
     - `validatePhoneNumber(phone)`
     - `logNotificationStatus(appointmentId, status, error)`

2. **Phone Number Validation**
   - Reuse existing validation from [`authController.js`](backend/src/controllers/authController.js:62)
   - Format: `+[country code][number]` (e.g., +919876543210)
   - Handle common Indian formats

3. **Message Templates**
   ```javascript
   // Appointment Confirmation Template
   `🎉 Appointment Confirmed!
   
   Hi ${userName},
   
   Your therapy session has been booked:
   
   📅 Date: ${date}
   🕐 Time: ${time} (${timezone})
   👨‍⚕️ Therapist: ${therapistName}
   🏥 Type: ${appointmentType}
   
   See you then!
   - TheraP Track Team`
   ```

### Phase 3: Integration

1. **Appointment Controller Integration**
   - Modify [`createAppointment()`](backend/src/controllers/appointmentController.js:4)
   - Add WhatsApp notification after successful creation
   - Non-blocking (don't fail if WhatsApp fails)

2. **Availability Slot Controller Integration**
   - Modify [`bookSlot()`](backend/src/controllers/availabilitySlotController.js:371)
   - Add WhatsApp notification after successful booking
   - Non-blocking implementation

3. **Error Handling**
   - Try-catch blocks around WhatsApp calls
   - Log errors but don't fail the main operation
   - Retry mechanism for failed notifications

### Phase 4: Logging and Monitoring

1. **Notification Logging**
   - Create table: `whatsapp_notifications`
   - Columns: `id`, `appointment_id`, `user_id`, `phone_number`, `status`, `sent_at`, `error_message`
   - Log all notification attempts

2. **Status Tracking**
   - Success/Failure rates
   - Error types and frequencies
   - Phone number validation issues

### Phase 5: Configuration and Control

1. **Feature Flags**
   - `WHATSAPP_ENABLED` - Master switch
   - `WHATSAPP_NOTIFICATION_TEMPLATE` - Template selection
   - Per-user opt-out option (future enhancement)

2. **Admin Controls**
   - Enable/disable WhatsApp notifications
   - View notification logs
   - Test WhatsApp integration

## Technical Specifications

### File Structure
```
backend/src/
├── services/
│   ├── whatsappService.js          # Core WhatsApp service
│   └── notificationService.js      # Notification orchestrator
├── utils/
│   └── phoneValidation.js          # Phone number utilities
├── controllers/
│   ├── appointmentController.js    # Modified for WhatsApp
│   └── availabilitySlotController.js # Modified for WhatsApp
└── models/
    └── WhatsAppNotification.js     # Notification logging model
```

### Database Schema
```sql
-- WhatsApp Notification Log Table
CREATE TABLE whatsapp_notifications (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'failed', 'delivered'
    twilio_message_sid VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_whatsapp_notifications_appointment ON whatsapp_notifications(appointment_id);
CREATE INDEX idx_whatsapp_notifications_user ON whatsapp_notifications(user_id);
CREATE INDEX idx_whatsapp_notifications_status ON whatsapp_notifications(status);
```

### API Endpoints (Future Enhancement)
```javascript
// For admin panel
GET    /api/whatsapp/status          # Get WhatsApp service status
POST   /api/whatsapp/test            # Test WhatsApp integration
GET    /api/whatsapp/logs            # Get notification logs
PUT    /api/whatsapp/settings        # Update WhatsApp settings
```

## Security Considerations

1. **Phone Number Privacy**
   - Encrypt phone numbers in logs
   - Only store last 4 digits in error messages
   - Comply with data protection regulations

2. **API Security**
   - Store Twilio credentials in environment variables
   - Use Twilio signature validation for webhooks
   - Rate limiting to prevent abuse

3. **Message Content**
   - No sensitive medical information in messages
   - Use generic appointment confirmations
   - Include privacy notice

## Testing Strategy

1. **Unit Tests**
   - Phone number validation
   - Message formatting
   - Error handling

2. **Integration Tests**
   - Twilio API integration
   - Appointment creation flow
   - Slot booking flow

3. **Manual Testing**
   - Test with real WhatsApp numbers
   - Verify message delivery
   - Test error scenarios

## Cost Considerations

### Twilio WhatsApp Pricing (India)
- **Per-message cost**: ~$0.01 USD per message
- **Monthly volume**: Estimate based on appointment volume
- **Sandbox vs Production**: Free sandbox for testing

### Cost Optimization
- Only send to validated phone numbers
- Batch notifications where possible
- Monitor usage and set alerts
- Consider fallback to SMS if WhatsApp fails

## Rollout Plan

1. **Phase 1**: Development and testing
2. **Phase 2**: Internal testing with team members
3. **Phase 3**: Beta testing with select clients
4. **Phase 4**: Full rollout with monitoring
5. **Phase 5**: Optimization based on feedback

## Success Metrics

- **Delivery Rate**: >95% of messages delivered
- **Error Rate**: <5% failure rate
- **Client Satisfaction**: Positive feedback on notifications
- **Cost per Notification**: Within budget
- **System Performance**: No impact on appointment booking speed

## Future Enhancements

1. **Rich Media Messages**: Include therapist photos, location maps
2. **Reminder Messages**: 24-hour and 1-hour appointment reminders
3. **Two-Way Communication**: Allow clients to confirm/cancel via WhatsApp
4. **Template Messages**: Use WhatsApp approved templates
5. **Analytics Dashboard**: Track notification effectiveness
6. **Multi-language Support**: Hindi and regional languages

## Risk Mitigation

1. **API Downtime**: Fallback to email notifications
2. **Phone Number Issues**: Validate before sending
3. **Cost Overruns**: Set spending limits and alerts
4. **Privacy Concerns**: Clear opt-in/opt-out mechanism
5. **Regulatory Compliance**: Follow TRAI guidelines for India

## Dependencies

- Twilio account with WhatsApp Business API access
- Verified WhatsApp Business number
- Privacy policy and terms of service updates
- Client consent for WhatsApp communications