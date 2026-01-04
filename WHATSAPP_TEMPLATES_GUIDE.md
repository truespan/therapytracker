# WhatsApp Message Templates Guide

This guide explains how WhatsApp message templates work in TheraP Track and how to configure them.

## Why Use Templates?

WhatsApp Business API has a **24-hour messaging window** policy:
- You can only send **free-form text messages** to users who have messaged you first
- After they message you, you have 24 hours to send them messages
- Outside this window, free-form messages are rejected by WhatsApp

**Message templates solve this problem:**
- ✅ Can be sent **anytime**, even if the user hasn't messaged you
- ✅ Pre-approved by WhatsApp (prevents spam)
- ✅ Perfect for appointment confirmations, reminders, and notifications

## How It Works

The system automatically:
1. **Tries to send via template first** (if configured and approved)
2. **Falls back to text message** if template fails or is not configured
3. **Logs which method was used** for debugging

## Template Configuration

### Step 1: Create Templates in Vonage Dashboard

1. Go to [Vonage Dashboard](https://dashboard.nexmo.com/) → **Messages and Dispatch** → **Templates**
2. Click **Create Template**
3. Fill in the template details:

**For Appointment Confirmation:**
- **Template Name**: `appointment_confirmation` (or your preferred name)
- **Category**: `UTILITY`
- **Language**: `en` (English)
- **Content**: 
```
Your appointment with {{1}} is confirmed for {{2}} at {{3}}.

Therapist: {{4}}
Type: {{5}}
Duration: {{6}}

Please arrive 5 minutes early.
```

**Template Parameters:**
- `{{1}}` = User Name
- `{{2}}` = Date (e.g., "Monday, January 15, 2024")
- `{{3}}` = Time (e.g., "10:00 AM")
- `{{4}}` = Therapist Name
- `{{5}}` = Appointment Type
- `{{6}}` = Duration (e.g., "60 minutes")

4. Submit for WhatsApp approval (usually 24-48 hours)
5. Once approved, note the **exact template name** (case-sensitive)

### Step 2: Configure in Environment Variables

Add to your backend `.env` file:

```env
# WhatsApp Message Templates
# Template names must match exactly as created in Vonage Dashboard
WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION=appointment_confirmation
WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER=appointment_reminder  # Optional
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLATION=appointment_cancellation  # Optional
```

### Step 3: Restart Server

After updating `.env`, restart your backend server:

```bash
cd backend
npm start
```

Check the logs - you should see:
```
[WhatsApp Service] Template Support: ENABLED
[WhatsApp Service] Templates configured:
  - Appointment Confirmation: appointment_confirmation
```

## Template Parameter Mapping

The system automatically maps appointment data to template parameters:

| Template Parameter | Source Data | Example |
|-------------------|-------------|---------|
| `{{1}}` | User Name | "John Doe" |
| `{{2}}` | Appointment Date | "Monday, January 15, 2024" |
| `{{3}}` | Appointment Time | "10:00 AM" |
| `{{4}}` | Therapist Name | "Dr. Sarah Johnson" |
| `{{5}}` | Appointment Type | "Therapy Session" |
| `{{6}}` | Duration | "60 minutes" |

**Note:** If your template has a different parameter structure, you may need to adjust the `prepareAppointmentConfirmationTemplateParams()` method in `backend/src/services/whatsappService.js`.

## Testing Templates

1. **Wait for template approval** (24-48 hours after submission)
2. **Create a test appointment** in your system
3. **Check the logs** - you should see:
   ```
   [WhatsApp Service] Attempting to send appointment confirmation via template: appointment_confirmation
   [WhatsApp Service] Template message sent successfully: <message_id>
   [WhatsApp Service] Message sent successfully: <message_id> (Template)
   ```

4. **Verify the message** - The recipient should receive the template message with all parameters filled in

## Fallback Behavior

If templates are not configured or fail:
- The system automatically falls back to free-form text messages
- Text messages are subject to the 24-hour window restriction
- The logs will show: `[WhatsApp Service] Sending appointment confirmation as text message`

## Troubleshooting

### Template Not Being Used

**Check:**
1. Template name in `.env` matches exactly (case-sensitive) with Vonage Dashboard
2. Template is approved in Vonage Dashboard (status should be "Approved")
3. Server was restarted after updating `.env`
4. Check logs for: `[WhatsApp Service] Template Support: ENABLED`

### Template Sending Fails

**Common errors:**
- **Template not found**: Template name doesn't match or template was deleted
- **Template not approved**: Wait for WhatsApp approval (24-48 hours)
- **Invalid parameters**: Check that parameter count matches template

**Solution:**
- Verify template name in Vonage Dashboard
- Check template status (must be "Approved")
- Review template parameter structure
- System will automatically fallback to text message

### Template Parameters Not Filling Correctly

**Check:**
1. Template parameter order matches the code
2. All required parameters are provided
3. Parameter values are not empty

**Adjust if needed:**
- Edit `prepareAppointmentConfirmationTemplateParams()` in `whatsappService.js`
- Ensure parameter order matches your template structure

## Best Practices

1. **Create templates early** - Approval takes 24-48 hours
2. **Use descriptive template names** - Makes it easier to manage
3. **Test templates thoroughly** - Verify all parameters fill correctly
4. **Keep template names consistent** - Use the same names across environments
5. **Monitor logs** - Check which method (template vs text) is being used

## Current Implementation

The system currently supports templates for:
- ✅ **Appointment Confirmations** - Fully implemented
- ⏳ **Appointment Reminders** - Template support ready (needs implementation)
- ⏳ **Appointment Cancellations** - Template support ready (needs implementation)

To add support for reminders or cancellations, you would need to:
1. Create the template in Vonage Dashboard
2. Add the template name to `.env`
3. Update the respective send methods in `whatsappService.js` to use templates

## Additional Resources

- [Vonage WhatsApp Templates Documentation](https://developer.vonage.com/en/messages/concepts/whatsapp-templates)
- [WhatsApp Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Vonage Dashboard](https://dashboard.nexmo.com/)





