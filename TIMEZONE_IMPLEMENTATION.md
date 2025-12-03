# Timezone Implementation for Appointments

## Overview
This document explains the timezone handling implementation for the appointment system. The system now properly converts appointment times between the user's local timezone and UTC for storage, ensuring appointments are displayed correctly regardless of the user's location.

## Key Concepts

### 1. **Storage Format**
- All appointment dates and times are stored in **UTC** in the database
- PostgreSQL `timestamptz` (timestamp with timezone) data type is used
- User's timezone is stored separately in the `timezone` column

### 2. **Display Format**
- When displaying appointments, UTC times are converted back to the user's local timezone
- The browser automatically detects the user's timezone using `moment.tz.guess()`

### 3. **Workflow**
```
User selects time (Local) → Convert to UTC → Store in Database
                                                      ↓
User views appointment ← Convert to Local ← Retrieve from Database (UTC)
```

## Implementation Details

### Database Changes

#### Migration File: `add_timezone_support.sql`
```sql
-- Adds timezone column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Adds timezone column to video_sessions table
ALTER TABLE video_sessions
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';
```

**To apply the migration:**
```bash
psql -U postgres -d your_database_name -f backend/database/migrations/add_timezone_support.sql
```

### Backend Changes

#### 1. Appointment Model (`backend/src/models/Appointment.js`)
- Updated `create()` method to accept timezone parameter
- Updated `update()` method to accept timezone parameter
- Changed timestamp casts from `timestamp` to `timestamptz` for proper timezone handling

**Changes:**
```javascript
// CREATE
INSERT INTO appointments (..., timezone)
VALUES (..., $8)

// UPDATE
timezone = COALESCE($7, timezone)
```

#### 2. Appointment Controller (`backend/src/controllers/appointmentController.js`)
- `createAppointment()` now accepts `timezone` in request body
- `updateAppointment()` now accepts `timezone` in request body
- Timezone is passed through to the model

### Frontend Changes

#### AppointmentModal Component (`frontend/src/components/calendar/AppointmentModal.jsx`)

**Key Changes:**

1. **Import moment-timezone:**
```javascript
import moment from 'moment-timezone';
```

2. **On Submit - Convert Local Time to UTC:**
```javascript
// Detect user's timezone
const userTimezone = moment.tz.guess();

// Create datetime in user's local timezone
const localDateTime = moment.tz(
  `${formData.appointment_date} ${formData.appointment_time}`,
  'YYYY-MM-DD HH:mm',
  userTimezone
);

// Convert to UTC for storage
const utcDateTime = localDateTime.clone().utc();
const utcEndDateTime = localDateTime.clone().add(formData.duration_minutes, 'minutes').utc();

// Send UTC time to backend
appointmentData = {
  ...
  appointment_date: utcDateTime.format('YYYY-MM-DD HH:mm:ss'),
  end_date: utcEndDateTime.format('YYYY-MM-DD HH:mm:ss'),
  timezone: userTimezone
};
```

3. **On Edit - Convert UTC Back to Local:**
```javascript
// Parse the UTC datetime and convert to user's timezone
const userTimezone = moment.tz.guess();
const localDateTime = moment.utc(appointment.appointment_date).tz(userTimezone);

// Display in local timezone
setFormData({
  ...
  appointment_date: localDateTime.format('YYYY-MM-DD'),
  appointment_time: localDateTime.format('HH:mm'),
  ...
});
```

## Example Scenario

### Creating an Appointment

**User in India (IST - UTC+5:30):**
- User selects: **December 3, 2025, 2:00 PM IST**
- System converts to UTC: **December 3, 2025, 8:30 AM UTC**
- Stored in database: `2025-12-03 08:30:00+00` with timezone `Asia/Kolkata`

**User in New York (EST - UTC-5:00) views the same appointment:**
- Database has: `2025-12-03 08:30:00+00`
- System converts to EST: **December 3, 2025, 3:30 AM EST**
- User sees: **December 3, 2025, 3:30 AM**

### Editing an Appointment

**User in India edits the appointment:**
1. System retrieves: `2025-12-03 08:30:00+00` (UTC)
2. Converts to IST: **December 3, 2025, 2:00 PM**
3. User sees and edits: **2:00 PM**
4. User changes to: **3:00 PM IST**
5. System converts to UTC: **December 3, 2025, 9:30 AM UTC**
6. Updates database with new UTC time

## Timezone Detection

The system uses `moment.tz.guess()` to automatically detect the user's timezone based on their browser settings. Common timezone identifiers:

- **India:** `Asia/Kolkata`
- **USA (Eastern):** `America/New_York`
- **USA (Pacific):** `America/Los_Angeles`
- **UK:** `Europe/London`
- **Australia (Sydney):** `Australia/Sydney`

## Testing

### Test Scenarios

1. **Create appointment in different timezones**
   - Create appointment in IST
   - View from EST - should show correct converted time

2. **Edit appointment across timezones**
   - Create in IST
   - Edit from EST
   - Verify time is correctly converted

3. **Daylight Saving Time (DST)**
   - Test during DST transitions
   - Ensure times adjust correctly

4. **Calendar display**
   - Verify appointments appear at correct times on calendar
   - Check that appointment slots don't overlap incorrectly

### Manual Testing Steps

1. **Create appointment:**
   ```
   - Open AppointmentModal
   - Select date and time
   - Submit
   - Check database: SELECT appointment_date, timezone FROM appointments;
   - Verify UTC time is correct
   ```

2. **View appointment:**
   ```
   - Refresh page
   - Open appointment for editing
   - Verify displayed time matches original input (in local timezone)
   ```

3. **Test from different timezone (use browser DevTools):**
   ```javascript
   // In browser console, change timezone
   Intl.DateTimeFormat().resolvedOptions().timeZone
   // Then create/view appointments
   ```

## Troubleshooting

### Issue: Appointments showing wrong time

**Solution:**
1. Check if migration was run: `\d appointments` in psql
2. Verify timezone column exists
3. Check browser console for timezone detection: `moment.tz.guess()`

### Issue: Database constraint errors

**Solution:**
1. Ensure migration was applied
2. Check if `timestamptz` is being used (not `timestamp`)
3. Verify timezone column has default value

### Issue: Existing appointments without timezone

**Solution:**
Run this SQL to update existing appointments:
```sql
UPDATE appointments
SET timezone = 'UTC'
WHERE timezone IS NULL;
```

## Future Enhancements

1. **User Preference:**
   - Allow users to set preferred timezone in profile
   - Override browser detection

2. **Timezone Display:**
   - Show timezone abbreviation (IST, EST, etc.) next to times
   - Add timezone selector in appointment form

3. **Multi-timezone Support:**
   - For partners working with clients in different timezones
   - Display both partner and client timezones

4. **Calendar Integration:**
   - Ensure FullCalendar properly handles timezone conversions
   - Update all calendar views to use timezone-aware times

## Dependencies

- **Backend:** PostgreSQL with timezone support
- **Frontend:**
  - `moment-timezone` (already installed via react-big-calendar)
  - Browser Intl API for timezone detection

## Files Modified

### Backend
- `backend/database/migrations/add_timezone_support.sql` (new)
- `backend/src/models/Appointment.js`
- `backend/src/controllers/appointmentController.js`
- `backend/src/models/VideoSession.js`
- `backend/src/controllers/videoSessionController.js`

### Frontend
- `frontend/src/components/calendar/AppointmentModal.jsx`
- `frontend/src/components/video/VideoSessionModal.jsx`

## References

- [Moment Timezone Documentation](https://momentjs.com/timezone/)
- [PostgreSQL Timezone Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [IANA Timezone Database](https://www.iana.org/time-zones)
