# Timezone Fix - Complete Deployment Guide

## Problem Summary
- **Local**: Creating availability at 11:30 PM works correctly
- **Production**: Same slot shows as next day 5:00 AM
- **Root Cause**: Production DB timezone is UTC, but backend wasn't forcing UTC for all connections

## Files Changed (Must Deploy ALL)

### Backend Files:
1. ✅ `src/config/database.js` - **CRITICAL**: Forces UTC timezone for all DB connections
2. ✅ `src/utils/dateUtils.js` - Fixed function names (fromZonedTime, toZonedTime)
3. ✅ `src/models/AvailabilitySlot.js` - Added timezone parameter support + explicit TIMESTAMPTZ queries
4. ✅ `src/controllers/availabilitySlotController.js` - Accepts timezone parameter from frontend
5. ✅ `src/routes/debug.js` - NEW: Debug endpoints to verify timezone handling
6. ✅ `src/routes/index.js` - Added debug routes

### Frontend Files:
1. ✅ `src/components/availability/AvailabilityTab.jsx` - Sends timezone parameter
2. ✅ `src/components/availability/AvailabilityCalendar.jsx` - Uses start_datetime field
3. ✅ `src/components/availability/BookingConfirmationModal.jsx` - Uses start_datetime field

---

## Step-by-Step Deployment

### STEP 1: Commit All Changes

```bash
git status  # Verify all files are listed above
git add .
git commit -m "fix: Complete timezone handling fix for availability slots

- Force UTC timezone for all database connections
- Send timezone parameter from frontend to backend
- Use TIMESTAMPTZ fields for display instead of TIME fields
- Add debug endpoints for production diagnostics"
git push origin master
```

### STEP 2: Deploy Backend

```bash
# SSH into production server
ssh your-server

# Navigate to project
cd /path/to/therapy-tracker

# Pull latest changes
git pull origin master

# Install dependencies (if needed)
cd backend
npm install

# **CRITICAL**: Restart backend server
pm2 restart all
# OR
systemctl restart your-backend-service
# OR
# Stop (Ctrl+C) and restart: npm start

# Verify backend is running
pm2 logs
# OR
systemctl status your-backend-service
```

### STEP 3: Verify Backend Deployment

**Test the debug endpoint** to confirm timezone handling is correct:

```bash
# Replace YOUR_DOMAIN with your actual production domain
curl https://YOUR_DOMAIN/api/debug/timezone

# Expected response:
{
  "status": "ok",
  "database_timezone": "UTC",  <-- Should be UTC
  "test_conversion": {
    "input": "2025-12-18 23:30 (Asia/Kolkata)",
    "output_utc": "2025-12-18T18:00:00.000Z",  <-- Should be 18:00 (23:30 - 5:30)
    "expected": "2025-12-18T18:00:00.000Z",
    "is_correct": true  <-- Should be true
  }
}
```

**If `is_correct: false`, the backend changes haven't deployed properly!**

### STEP 4: Deploy Frontend

```bash
cd ../frontend
npm install
npm run build

# Deploy build folder to web server
# Example for nginx:
sudo cp -r build/* /var/www/html/

# Example for other hosting:
# Upload the build/ folder to your hosting service
```

### STEP 5: Test in Production

1. **Clear browser cache** and refresh the page
2. **Delete old availability slots** (created before this fix)
3. **Create a new slot**: 11:30 PM to 11:45 PM
4. **Verify**:
   - Availability calendar shows: **11:30 PM to 11:45 PM** ✅
   - NOT: 5:00 AM to 5:15 AM ❌

5. **Book an appointment** from that slot
6. **Verify** appointment shows: **11:30 PM to 11:45 PM** ✅

---

## Troubleshooting

### Issue 1: Debug endpoint shows `is_correct: false`

**Problem**: Backend changes not deployed properly

**Solution**:
```bash
# Check which files changed
cd backend
git diff HEAD~1 src/config/database.js

# Should show the timezone forcing code
# If not, you're not on the latest commit
git log --oneline -5
git pull origin master
pm2 restart all
```

### Issue 2: Still getting wrong times after deployment

**Problem**: Old data in database or browser cache

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Delete old availability slots
3. Create fresh slots after deployment

### Issue 3: Debug endpoint returns 404

**Problem**: Backend not restarted or routes not loaded

**Solution**:
```bash
# Check backend logs
pm2 logs

# Restart backend
pm2 restart all

# Test endpoint again
curl https://YOUR_DOMAIN/api/debug/timezone
```

### Issue 4: Database timezone still shows "Asia/Calcutta"

**Problem**: Database connection not forcing UTC

**Solution**:
1. Verify `src/config/database.js` has the UTC forcing code
2. Check backend logs for "Database session timezone set to UTC"
3. If missing, restart backend

---

## Verification Checklist

Before considering the deployment complete, verify:

- [ ] Backend restarted successfully
- [ ] Debug endpoint returns `is_correct: true`
- [ ] Database timezone shows "UTC"
- [ ] Test conversion 23:30 IST → 18:00 UTC
- [ ] Frontend deployed (build folder updated)
- [ ] Browser cache cleared
- [ ] Old slots deleted
- [ ] New slot created at 11:30 PM
- [ ] Slot displays as 11:30 PM (not 5:00 AM)
- [ ] Appointment created from slot
- [ ] Appointment shows 11:30 PM (not 5:00 AM)

---

## Debug Endpoints

### GET /api/debug/timezone
Returns timezone configuration and test conversion

```bash
curl https://YOUR_DOMAIN/api/debug/timezone
```

### GET /api/debug/test-slot?partner_id=X
Tests the exact flow used when creating availability slots

```bash
curl https://YOUR_DOMAIN/api/debug/test-slot?partner_id=1
```

---

## Important Notes

1. **All old availability slots** created before this fix will have incorrect times - DELETE them
2. **The database connection MUST use UTC** - this is enforced in database.js
3. **Both frontend AND backend** must be deployed
4. **Clear browser cache** after frontend deployment
5. **Test with debug endpoints** BEFORE testing with actual slot creation

---

## Support

If issues persist after following this guide:

1. Check debug endpoint responses
2. Check backend logs for errors
3. Verify all files were committed and pushed
4. Ensure backend was restarted (not just reloaded)
5. Try creating a slot in an incognito window (fresh browser session)
