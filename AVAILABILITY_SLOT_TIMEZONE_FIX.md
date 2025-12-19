# Availability Slot Booking Timezone Fix - December 19, 2025

## Issue

Appointments created through **calendar** were stored with correct time, but appointments created through **availability slot booking** had a 5.5 hour timezone offset.

### Example
- User creates availability slot at **14:30 IST** (India Standard Time)
- User books the slot
- **Expected**: Appointment stored at **09:00 UTC** (14:30 - 5:30 = 09:00)
- **Actual (before fix)**: Appointment stored at **03:30 UTC** (wrong!)

## Root Cause

In `backend/src/controllers/availabilitySlotController.js`, the `bookSlot` function (lines 393-407) was manually constructing ISO datetime strings from formatted date/time parts:

```javascript
// OLD CODE (WRONG)
const slotDate = slot.slot_date_formatted;  // From TO_CHAR(slot_date, 'YYYY-MM-DD')
const startTime = slot.start_time_formatted; // From TO_CHAR(start_time, 'HH24:MI')

const startISO = `${slotDate}T${startTime}:00Z`; // Manual string construction
const endISO = `${slotDate}T${endTime}:00Z`;
```

The problem:
1. `TO_CHAR()` formats dates in the **session timezone**
2. Manual string construction with `Z` suffix was **incorrectly** marking them as UTC
3. This caused PostgreSQL to apply timezone conversion in the wrong direction

## The Fix

Use the `start_datetime` and `end_datetime` fields **directly** instead of reconstructing them:

```javascript
// NEW CODE (CORRECT)
const startDatetime = new Date(slot.start_datetime); // Already UTC timestamptz
const endDatetime = new Date(slot.end_datetime);     // Already UTC timestamptz

const appointment = await Appointment.create({
  partner_id: slot.partner_id,
  user_id: userId,
  title: appointmentTitle,
  appointment_date: startDatetime.toISOString(), // Direct ISO conversion
  end_date: endDatetime.toISOString(),
  duration_minutes: durationMinutes,
  notes: `Booked via availability slot #${id}`,
  timezone: 'UTC'
});
```

## Changes Made

### File Modified
- **`backend/src/controllers/availabilitySlotController.js`** (lines 390-417)

### What Changed
1. Removed manual ISO string construction from formatted date parts
2. Used `slot.start_datetime` and `slot.end_datetime` directly (they're already UTC)
3. Added better logging to track datetime values during booking
4. Removed dependency on `TO_CHAR()` formatted fields

## Testing

Created comprehensive test: `backend/test-availability-booking.js`

### Test Results
```
✅ Slot created at: 2024-12-20T09:00:00.000Z (CORRECT)
✅ Slot retrieved at: 2024-12-20T09:00:00.000Z (CORRECT)
✅ Appointment created at: 2024-12-20T09:00:00.000Z (CORRECT)

✅ SUCCESS: Availability slot booking correctly handles timezones!
```

## How It Works Now

### Complete Flow

1. **Partner creates availability slot** at 14:30 IST:
   - Frontend sends: `slot_date: '2024-12-20', start_time: '14:30', timezone: 'Asia/Kolkata'`
   - Backend `combineDateAndTime()` converts: `'2024-12-20T14:30'` + `'Asia/Kolkata'` → `2024-12-20T09:00:00.000Z` (UTC)
   - PostgreSQL stores: `start_datetime = 2024-12-20 09:00:00+00`

2. **Client books the slot**:
   - Backend retrieves slot with `start_datetime = 2024-12-20T09:00:00.000Z`
   - Creates `new Date(slot.start_datetime)` → JavaScript Date object in UTC
   - Converts to ISO: `startDatetime.toISOString()` → `'2024-12-20T09:00:00.000Z'`
   - Creates appointment with this ISO string
   - PostgreSQL stores: `appointment_date = 2024-12-20 09:00:00+00` ✅

3. **Frontend displays**:
   - API returns: `appointment_date: '2024-12-20T09:00:00.000Z'`
   - Frontend `toZonedTime()` converts to IST: 14:30 IST ✅
   - User sees: 14:30 (their local time) ✅

## Why This Is Better

### Before (Manual Construction)
```javascript
// Fragile and error-prone
const startISO = `${slotDate}T${startTime}:00Z`;
// ❌ Depends on TO_CHAR() formatting
// ❌ String manipulation can introduce bugs
// ❌ Timezone conversion happens twice (once in TO_CHAR, once in Postgres)
```

### After (Direct Usage)
```javascript
// Robust and correct
const startDatetime = new Date(slot.start_datetime);
const startISO = startDatetime.toISOString();
// ✅ Uses native Date object
// ✅ No string manipulation
// ✅ Single source of truth (start_datetime field)
```

## Deployment

### No Database Changes Required
The fix only changes application code. No migrations needed.

### Steps to Deploy

1. **Restart backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Test availability slot booking**:
   - Create an availability slot
   - Publish it
   - Book it as a client
   - Verify appointment appears at correct time

3. **Run test script** (optional):
   ```bash
   cd backend
   node test-availability-booking.js
   ```

## Related Fixes

This fix is part of the broader timezone handling improvements documented in:
- `TIMEZONE_FIX_SUMMARY.md` - Calendar appointment creation fix
- Both issues were caused by incorrect timezone handling, but in different parts of the code

## Files Modified Summary

1. ✅ `backend/src/controllers/availabilitySlotController.js` - Fixed bookSlot function

## Test Files Created (for debugging)

- `backend/test-availability-booking.js` - Comprehensive booking test

---

**Status**: ✅ FIXED and TESTED
**Date**: December 19, 2025
**Impact**: Appointments created via availability slot booking now have correct timestamps
