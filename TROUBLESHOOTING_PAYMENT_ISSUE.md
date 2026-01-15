# Troubleshooting: Payment Not Required in "Book a Session" Tab

## Issue
When booking from "Book a Session" tab, payment is bypassed even though `NODE_ENV=production` is set and booking fee is configured.

## Step-by-Step Troubleshooting

### Step 1: Verify Booking Fee is Set Correctly

1. **Log in as a Partner/Therapist**
2. **Go to your profile/settings**
3. **Check Fee Settings:**
   - Look for **"Booking Fee"** field (NOT "Session Fee")
   - Make sure it's set to **1** (or any value > 0)
   - **Important:** "Session Fee" and "Booking Fee" are different fields
   - The "Book a Session" tab uses **"Booking Fee"**
   - The public booking link uses **"Session Fee"**

4. **If Booking Fee is 0 or empty:**
   - Set it to 1 (or your desired amount)
   - Save the settings
   - Try booking again

### Step 2: Verify Backend Environment

1. **Check your production server logs** when it starts up
2. **Look for this line:**
   ```
   Environment: production
   ```
3. **If you see `Environment: development` or `Environment: undefined`:**
   - Your `NODE_ENV` is not set correctly
   - See PRODUCTION_DEPLOYMENT_STEPS.md for how to fix

### Step 3: Verify Code is Deployed

1. **Check if the latest code is deployed:**
   - The fix was in `backend/src/services/razorpayService.js`
   - The `isTestMode()` function should check `NODE_ENV`, not Razorpay key

2. **Restart your backend server** after deploying:
   ```bash
   # If using PM2
   pm2 restart all
   
   # If using systemd
   sudo systemctl restart your-backend-service
   
   # If using Docker
   docker-compose restart backend
   ```

### Step 4: Check Browser Console

1. **Open browser console** (F12)
2. **Try booking a slot**
3. **Look for these debug messages:**
   ```
   [BOOKING] Fee settings: {...}
   [BOOKING] Booking fee: 1
   [BOOKING] Initiating payment flow for booking fee: 1
   ```

4. **If you see:**
   ```
   [BOOKING] Booking fee: 0
   [BOOKING] No booking fee, proceeding with direct booking
   ```
   - This means the booking fee is not being loaded correctly
   - Check Step 1 - make sure booking_fee is set in partner settings

### Step 5: Check Backend Logs

1. **When you try to book, check backend logs for:**
   ```
   [CREATE_BOOKING_ORDER] NODE_ENV: production, isTestMode: false, bookingFee: 1
   ```

2. **If you see:**
   ```
   [CREATE_BOOKING_ORDER] Test mode detected - skipping payment
   [CREATE_BOOKING_ORDER] WARNING: Payment bypassed! NODE_ENV=production
   ```
   - This means `isTestMode()` is returning `true` even though NODE_ENV=production
   - Check that the code changes are deployed
   - Restart the server

3. **If you see:**
   ```
   [CREATE_BOOKING_ORDER] NODE_ENV: development, isTestMode: true
   ```
   - Your NODE_ENV is not set to production
   - Fix the environment variable

### Step 6: Test API Directly

Test the fee settings API directly:

```bash
# Replace YOUR_TOKEN and PARTNER_ID with actual values
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend-url.com/api/partners/PARTNER_ID/fee-settings
```

**Expected response:**
```json
{
  "feeSettings": {
    "session_fee": 100,
    "booking_fee": 1,
    "fee_currency": "INR"
  }
}
```

**If booking_fee is null or 0:**
- Set it in partner settings
- Try again

### Step 7: Verify Database

If the API shows booking_fee as null/0 even though you set it:

1. **Check database directly:**
   ```sql
   SELECT id, name, booking_fee, session_fee, fee_currency 
   FROM partners 
   WHERE id = YOUR_PARTNER_ID;
   ```

2. **If booking_fee is NULL or 0:**
   ```sql
   UPDATE partners 
   SET booking_fee = 1 
   WHERE id = YOUR_PARTNER_ID;
   ```

## Common Issues and Solutions

### Issue 1: "Booking Fee shows 0 in console"
**Cause:** Booking fee is not set in partner settings  
**Solution:** Set booking_fee to 1 (or desired amount) in partner profile settings

### Issue 2: "Backend logs show NODE_ENV=development"
**Cause:** Environment variable not set correctly  
**Solution:** Set `NODE_ENV=production` in your hosting platform and restart server

### Issue 3: "Backend logs show isTestMode: true even with NODE_ENV=production"
**Cause:** Old code is still running  
**Solution:** 
1. Verify latest code is deployed
2. Restart backend server
3. Check that `backend/src/services/razorpayService.js` has the updated `isTestMode()` function

### Issue 4: "Fee settings API returns null for booking_fee"
**Cause:** Database value is null  
**Solution:** Update booking_fee in database or through partner settings UI

### Issue 5: "Public booking works but 'Book a Session' doesn't"
**Cause:** Different fee fields used  
**Solution:** 
- Public booking uses `session_fee`
- "Book a Session" uses `booking_fee`
- Make sure BOTH are set if you want payment for both flows

## Quick Verification Checklist

- [ ] `NODE_ENV=production` is set on production server
- [ ] Backend server has been restarted after setting NODE_ENV
- [ ] Server logs show "Environment: production"
- [ ] Latest code is deployed (check `razorpayService.js`)
- [ ] `booking_fee` is set to > 0 in partner settings (not just `session_fee`)
- [ ] Browser console shows `[BOOKING] Booking fee: 1` (or your amount)
- [ ] Backend logs show `isTestMode: false` when booking
- [ ] Backend logs show `bookingFee: 1` (or your amount)

## Still Not Working?

If after all these steps payment is still bypassed:

1. **Share these details:**
   - Backend startup log (showing Environment: ...)
   - Browser console logs when booking
   - Backend logs when creating booking order
   - Response from fee settings API

2. **Check for caching:**
   - Clear browser cache
   - Hard refresh (Ctrl+Shift+R)
   - Try in incognito mode

3. **Verify API response:**
   - Check what `createBookingOrder` API returns
   - It should NOT have `test_mode: true` or `skip_payment: true` in production

## Expected Behavior

### In Production (NODE_ENV=production):
- ✓ Payment ALWAYS required when booking_fee > 0
- ✓ Razorpay modal appears
- ✓ Booking completes only after payment
- ✗ Payment is NEVER bypassed

### In Development (NODE_ENV=development):
- ✓ Payment bypassed for testing
- ✓ Booking completes without payment
- ✓ "Test Mode - Payment Skipped" message shown
