# WhatsApp Reminder Fix - January 2026

## Issue Identified

WhatsApp appointment reminders were not being sent 4 hours before appointment time.

## Root Cause

The SQL query in `Appointment.findAppointmentsNeedingReminders()` had a **too narrow time window**:
- **Previous window**: 4 hours to 4 hours 10 minutes (only 10 minutes)
- **Problem**: With cron running every 10 minutes, appointments could be missed if they fell between cron runs

## Solution Applied

Expanded the query window to ensure reliable reminder delivery:
- **New window**: 3 hours 50 minutes to 4 hours 20 minutes (30 minutes)
- **File changed**: `backend/src/models/Appointment.js`
- **Line updated**: Lines 253-254

### Before:
```sql
AND a.appointment_date <= NOW() + INTERVAL '4 hours 10 minutes'
AND a.appointment_date >= NOW() + INTERVAL '4 hours'
```

### After:
```sql
AND a.appointment_date <= NOW() + INTERVAL '4 hours 20 minutes'
AND a.appointment_date >= NOW() + INTERVAL '3 hours 50 minutes'
```

## WhatsApp Template Parameters

The reminder template uses **4 parameters in this order**:

1. **{{1}} - Client Name**: `userName` from appointmentData
   - Example: "Krishnn"
   - Default: "Client" if empty

2. **{{2}} - Session Type**: Determined from appointment title
   - "Therapy Session - Online" (if title contains "online")
   - "Therapy Session - In Person" (default or if contains "offline"/"in-person")

3. **{{3}} - Date**: Formatted as full date with weekday
   - Example: "Sunday, 4 January 2026"
   - Format: `toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`
   - Timezone: Uses appointment timezone or defaults to 'Asia/Kolkata'

4. **{{4}} - Time**: Formatted time without :00 minutes
   - Example: "10 am" (removes :00, converts to lowercase)
   - Format: `toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })`
   - Timezone: Uses appointment timezone or defaults to 'Asia/Kolkata'

## How It Works

1. **Cron Job**: Runs every 10 minutes (at :00, :10, :20, :30, :40, :50)
2. **Query**: Finds appointments in the 30-minute window (3h50m to 4h20m before)
3. **Subscription Check**: Verifies partner and organization have WhatsApp access
4. **Queue**: Adds reminder to WhatsApp service queue for rate-limited sending
5. **Template**: Uses `theraptrack_appointment_reminder` template with 4 parameters
6. **Logging**: Records success/failure in `whatsapp_notifications` table

## Testing

Use the diagnostic scripts to verify:
- `check-reminder-logs.js` - Check recent reminder notifications
- `check-all-appointments.js` - View all appointments and their reminder status
- `check-failed-reminders.js` - Check for failed reminder attempts
- `test-cron-job.js` - Test the query and cron schedule

## Verification

After the fix, reminders should be sent reliably for all appointments within the 30-minute window, even if they fall between cron job runs.

