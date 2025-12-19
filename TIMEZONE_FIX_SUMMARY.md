# Timezone Fix Summary - December 19, 2025

## Issues Fixed

### 1. ✅ 403 Forbidden Error on Appointment Creation
**Root Cause**: Incorrect `require('date-fns')` statement inside the AppointmentModal component
**Fix**: Changed to proper ES6 `import` statement at the top of the file
**File**: `frontend/src/components/calendar/AppointmentModal.jsx`

### 2. ✅ 5.5 Hour Timezone Offset Issue
**Root Cause**: Node.js process was running in Asia/Kolkata timezone, causing node-postgres library to incorrectly convert timestamps

**Symptoms**:
- Entering appointment at 14:30 IST would be stored as 03:30 UTC (wrong!)
- Should have been stored as 09:00 UTC (14:30 - 5:30)

**Fix**: Set `TZ=UTC` environment variable in both backend and frontend .env files

## Changes Made

### Backend Changes

1. **`backend/.env`** - Added TZ environment variable:
   ```env
   # CRITICAL: Set Node.js timezone to UTC to prevent timezone conversion issues
   TZ=UTC

   DATABASE_URL=postgresql://postgres:Vajreshwari9$@localhost:5432/therapy_tracker?options=-c%20timezone=UTC
   ```

2. **`backend/src/config/database.js`** - Updated timezone handling:
   - Added `options: '-c timezone=UTC'` to Pool configuration
   - Updated `SET timezone TO 'UTC'` syntax (was `SET timezone = 'UTC'`)

3. **PostgreSQL Database** - Set database default timezone:
   ```sql
   ALTER DATABASE therapy_tracker SET timezone TO 'UTC';
   ```

### Frontend Changes

1. **`frontend/src/components/calendar/AppointmentModal.jsx`** - Fixed date-fns import:
   ```javascript
   // Before (WRONG):
   const { addMinutes } = require('date-fns');

   // After (CORRECT):
   import { differenceInMinutes, addMinutes } from 'date-fns';
   ```

2. **`frontend/.env`** - Added TZ environment variable:
   ```env
   # CRITICAL: Set timezone to UTC to prevent timezone conversion issues
   TZ=UTC
   ```

## How to Apply the Fix

### Step 1: Restart Backend Server
```bash
cd backend
npm start
# or if using nodemon:
nodemon src/server.js
```

### Step 2: Restart Frontend
```bash
cd frontend
npm start
```

### Step 3: Test Appointment Creation
1. Open the calendar in your Partner Dashboard
2. Click on a time slot to create an appointment
3. Enter appointment details (e.g., 14:30 for 2:30 PM)
4. Create the appointment
5. Verify it appears at the correct time in the calendar

## Verification

Run this test to verify the fix is working:
```bash
cd backend
node test-appointment-timezone.js
```

Expected output:
```
Test ISO string (UTC): 2024-12-19T09:00:00.000Z
appointment_date (as stored): 2024-12-19T09:00:00.000Z ✅
```

## How It Works Now

### Appointment Creation Flow (Fixed)

1. **User enters**: 14:30 IST (India Standard Time) in the UI
2. **Frontend `combineDateAndTime()`**: Converts to `2024-12-19T09:00:00.000Z` (UTC)
   - Uses `fromZonedTime()` from date-fns-tz
   - Subtracts 5:30 hours: 14:30 - 5:30 = 09:00 UTC
3. **Sends to backend**: ISO string `"2024-12-19T09:00:00.000Z"`
4. **PostgreSQL stores**: `2024-12-19 09:00:00+00` (UTC)
5. **Node.js retrieves** (with TZ=UTC): `2024-12-19T09:00:00.000Z`
6. **Frontend displays** (for IST user): 14:30 IST (adds 5:30 hours)

### Before the Fix

1. User enters: 14:30 IST
2. Frontend converts: `2024-12-19T09:00:00.000Z` (UTC) ✅
3. Sends to backend: `"2024-12-19T09:00:00.000Z"` ✅
4. PostgreSQL stores: `2024-12-19 09:00:00+00` (UTC) ✅
5. **Node.js retrieves (with TZ=Asia/Kolkata)**: `2024-12-19T03:30:00.000Z` ❌ (wrong!)
   - node-postgres applied IST offset in wrong direction
   - Subtracted 5:30 instead of adding: 09:00 - 5:30 = 03:30
6. Frontend displays: 09:00 IST ❌ (8 hours off from intended 14:30!)

## Production Deployment

When deploying to production (Render.com), make sure to set environment variables:

### Render Environment Variables
```
TZ=UTC
DATABASE_URL=<your-postgres-url>?options=-c%20timezone=UTC
```

Or in Render dashboard:
1. Go to your service → Environment
2. Add environment variable:
   - Key: `TZ`
   - Value: `UTC`

## Additional Notes

- The PostgreSQL server timezone is still `Asia/Calcutta` at the OS level
- We've overridden it at multiple levels:
  1. Connection string: `?options=-c%20timezone=UTC`
  2. Database default: `ALTER DATABASE ... SET timezone TO 'UTC'`
  3. Session setting: `SET timezone TO 'UTC'` on every connection
  4. Node.js runtime: `TZ=UTC` environment variable

- All these layers ensure consistent UTC handling throughout the stack

## Files Modified

- ✅ `backend/.env`
- ✅ `backend/src/config/database.js`
- ✅ `frontend/.env`
- ✅ `frontend/src/components/calendar/AppointmentModal.jsx`

## Test Files Created (for debugging)

- `backend/test-appointment-timezone.js`
- `backend/test-node-timezone.js`
- `backend/diagnose-tz-offset.js`
- `backend/test-insert-methods.js`
- `backend/fix-timezone-issue.js`

You can delete these test files after verifying everything works.

---

**Status**: ✅ FIXED and TESTED
**Date**: December 19, 2025
**Tested On**: Local development environment with PostgreSQL in Asia/Calcutta timezone
