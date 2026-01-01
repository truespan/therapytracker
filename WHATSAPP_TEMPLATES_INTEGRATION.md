# WhatsApp Manager Templates Integration

This document describes the integration of WhatsApp Manager Templates with the TheraP Track application.

## Overview

The following WhatsApp Manager Templates have been integrated:

1. **theraptrack_appointment_is_booked** - Triggered when a booking is made by the client
2. **theraptrack_appointment_cancelled** - Triggered when an appointment is cancelled
3. **theraptrack_appointment_reminder** - Triggered 4 hours before the appointment time
4. **theraptrack_appointment_rescheduled** - Triggered when an appointment is rescheduled (ready for when rescheduling feature is implemented)

## Implementation Details

### 1. WhatsApp Service Updates

**File:** `backend/src/services/whatsappService.js`

- Added support for all four template names
- Templates are loaded from environment variables with fallback defaults:
  - `WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION` or `WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED` → defaults to `theraptrack_appointment_is_booked`
  - `WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER` → defaults to `theraptrack_appointment_reminder`
  - `WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLATION` → defaults to `theraptrack_appointment_cancelled`
  - `WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED` → defaults to `theraptrack_appointment_rescheduled`

**New Methods Added:**
- `sendAppointmentCancellation()` - Queues cancellation notification
- `sendAppointmentCancellationDirect()` - Sends cancellation notification directly
- `sendAppointmentRescheduled()` - Queues rescheduling notification
- `sendAppointmentRescheduledDirect()` - Sends rescheduling notification directly
- `sendAppointmentReminder()` - Queues reminder notification
- `sendAppointmentReminderDirect()` - Sends reminder notification directly
- `createAppointmentCancellationMessage()` - Creates cancellation message text
- `createAppointmentRescheduledMessage()` - Creates rescheduling message text
- `createAppointmentReminderMessage()` - Creates reminder message text

**Queue Processing:**
- Added support for new message types: `appointment_cancellation`, `appointment_rescheduled`, `appointment_reminder`

### 2. Appointment Controller Updates

**File:** `backend/src/controllers/appointmentController.js`

**Changes:**
- **Appointment Booking:** Already sends notification using `theraptrack_appointment_is_booked` template (via existing `sendWhatsAppNotifications()`)
- **Appointment Cancellation:** 
  - Detects when appointment status changes to 'cancelled'
  - Sends cancellation notification via `sendWhatsAppCancellationNotification()`
  - Also triggered when appointment is deleted
- **Appointment Rescheduling:**
  - Detects when appointment date/time changes
  - Sends rescheduling notification via `sendWhatsAppReschedulingNotification()`
  - Includes both old and new appointment details

**New Helper Functions:**
- `sendWhatsAppCancellationNotification()` - Handles cancellation notification logic
- `sendWhatsAppReschedulingNotification()` - Handles rescheduling notification logic

### 3. Appointment Model Updates

**File:** `backend/src/models/Appointment.js`

**New Method:**
- `findAppointmentsNeedingReminders()` - Finds appointments that need reminders (4 hours before appointment time)
  - Returns appointments scheduled between 4 hours and 4 hours 10 minutes from now
  - Excludes appointments that already have sent reminder notifications
  - Includes user and partner details for notification sending

### 4. Reminder Scheduler Job

**File:** `backend/src/jobs/sendAppointmentReminders.js`

**Features:**
- Runs every 10 minutes via cron job
- Checks for appointments needing reminders (4 hours before appointment)
- Verifies partner and organization WhatsApp access before sending
- Sends reminders via WhatsApp service
- Logs success/failure for each reminder
- Prevents duplicate reminders by checking existing notifications

**Server Integration:**
- Added to `backend/src/server.js` to start on server initialization

## Template Parameter Mapping

All templates use the same parameter structure as appointment confirmation:

1. `{{1}}` - User Name
2. `{{2}}` - Appointment Date (formatted)
3. `{{3}}` - Appointment Time (formatted)
4. `{{4}}` - Therapist Name
5. `{{5}}` - Appointment Type
6. `{{6}}` - Duration

**Note:** For rescheduling template, you may need to adjust parameters to include old date/time. The current implementation sends the new appointment details, but you can modify `prepareAppointmentConfirmationTemplateParams()` if your template requires different parameters.

## Environment Variables

The following environment variables can be set in `backend/.env`:

```env
# WhatsApp Template Names (optional - defaults are set)
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER=theraptrack_appointment_reminder
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLATION=theraptrack_appointment_cancelled
WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED=theraptrack_appointment_rescheduled
```

If not set, the system will use the default template names listed above.

## How It Works

### 1. Appointment Booking
- When an appointment is created via `createAppointment()`
- Sends notification using `theraptrack_appointment_is_booked` template
- Falls back to text message if template fails or is not configured

### 2. Appointment Cancellation
- When appointment status is changed to 'cancelled' in `updateAppointment()`
- When appointment is deleted in `deleteAppointment()`
- Sends notification using `theraptrack_appointment_cancelled` template
- Falls back to text message if template fails or is not configured

### 3. Appointment Rescheduling
- When appointment date/time is changed in `updateAppointment()`
- Detects if `appointment_date` or `end_date` has changed
- Sends notification using `theraptrack_appointment_rescheduled` template
- Includes both old and new appointment details
- Falls back to text message if template fails or is not configured

### 4. Appointment Reminders
- Cron job runs every 10 minutes
- Checks for appointments scheduled 4 hours from now (with 10-minute window)
- Sends reminder using `theraptrack_appointment_reminder` template
- Prevents duplicate reminders by checking existing notifications
- Falls back to text message if template fails or is not configured

## Testing

### Test Appointment Booking
1. Create a new appointment via API
2. Check logs for: `[WhatsApp Service] Attempting to send appointment confirmation via template: theraptrack_appointment_is_booked`
3. Verify message is received on client's WhatsApp

### Test Appointment Cancellation
1. Update an appointment status to 'cancelled' via API
2. Check logs for: `[WhatsApp Service] Attempting to send appointment cancellation via template: theraptrack_appointment_cancelled`
3. Verify cancellation message is received

### Test Appointment Rescheduling
1. Update an appointment's date/time via API
2. Check logs for: `[WhatsApp Service] Attempting to send appointment rescheduled via template: theraptrack_appointment_rescheduled`
3. Verify rescheduling message is received with old and new details

### Test Appointment Reminders
1. Create an appointment scheduled for 4 hours from now
2. Wait for the cron job to run (runs every 10 minutes)
3. Check logs for: `[Cron] Running appointment reminder job...`
4. Verify reminder message is received 4 hours before appointment

## Database

The system uses the existing `whatsapp_notifications` table to:
- Track sent notifications
- Prevent duplicate reminders
- Log notification status (sent/failed)
- Store message type (appointment_confirmation, appointment_cancellation, appointment_rescheduled, appointment_reminder)

## Notes

- All WhatsApp notifications respect partner/organization subscription plans (only sent if WhatsApp is enabled)
- Notifications are queued for rate limiting (2 seconds between messages)
- Failed notifications are retried up to 3 times with exponential backoff
- All notifications are non-blocking (won't fail appointment operations if WhatsApp fails)
- Template messages fall back to text messages if template fails or is not configured
- Reminder system prevents duplicate reminders by checking existing notifications

## Future Enhancements

- Rescheduling feature is not yet implemented in the frontend, but the backend is ready
- When rescheduling is implemented, it will automatically trigger the rescheduling notification
- Consider adding reminder preferences (some users may not want reminders)
- Consider adding different reminder times (e.g., 24 hours, 1 hour before)

