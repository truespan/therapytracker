# Production Deployment Steps - Fix Payment Bypass Issue

## Problem
Your production server is currently running with `NODE_ENV` not set to `production`, which is why payments are being bypassed.

## Solution: Set NODE_ENV=production on Your Production Server

### Step 1: Identify Your Hosting Platform
Where is your backend deployed? Common options:
- Render.com
- Railway.app
- Heroku
- AWS EC2
- DigitalOcean
- Your own VPS

### Step 2: Set Environment Variable Based on Platform

#### Option A: Render.com
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add or update: `NODE_ENV` = `production`
5. Click "Save Changes"
6. Render will automatically redeploy

#### Option B: Railway.app
1. Go to your Railway dashboard
2. Select your backend project
3. Go to "Variables" tab
4. Add or update: `NODE_ENV` = `production`
5. Railway will automatically redeploy

#### Option C: Heroku
1. Go to your Heroku dashboard
2. Select your app
3. Go to "Settings" tab
4. Click "Reveal Config Vars"
5. Add or update: `NODE_ENV` = `production`
6. Heroku will automatically restart

#### Option D: AWS/DigitalOcean/VPS (Manual)
1. SSH into your server
2. Edit your `.env` file:
   ```bash
   nano /path/to/your/backend/.env
   ```
3. Add or update this line:
   ```
   NODE_ENV=production
   ```
4. Save and exit (Ctrl+X, Y, Enter)
5. Restart your backend service:
   ```bash
   # If using PM2
   pm2 restart all
   
   # If using systemd
   sudo systemctl restart your-backend-service
   
   # If running directly
   # Stop the current process and start again
   node src/server.js
   ```

#### Option E: Docker
1. Update your `docker-compose.yml` or Dockerfile:
   ```yaml
   environment:
     - NODE_ENV=production
   ```
2. Rebuild and restart:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Step 3: Verify the Environment is Set Correctly

After deployment, check your server logs. You should see:
```
Server is running on port 5000
Environment: production
```

If you see `Environment: development` or `Environment: undefined`, the NODE_ENV is not set correctly.

### Step 4: Test Payment Flow

1. **Test with Booking Fee = Rs. 1**
   - Log in as a client
   - Go to "Book a Session" tab
   - Select an available slot
   - Click "Confirm Booking"
   - **Expected Result:** Razorpay payment modal should appear
   - Complete the test payment
   - Booking should be confirmed after payment

2. **Verify in Razorpay Dashboard**
   - Go to your Razorpay dashboard
   - Check if the test payment appears in transactions
   - This confirms the payment flow is working

### Step 5: Test Free Bookings Still Work

1. Set booking fee to 0 in therapist settings
2. Try booking
3. **Expected Result:** Booking completes immediately without payment (correct behavior)

## Quick Verification Commands

### Check Current Environment (if you have SSH access)
```bash
# SSH into your server
ssh user@your-server.com

# Check if NODE_ENV is set
echo $NODE_ENV

# Check running processes
ps aux | grep node

# Check server logs
tail -f /path/to/logs/server.log
# OR if using PM2
pm2 logs
```

### Check via API (from your browser console)
```javascript
// Open your production site
// Open browser console (F12)
// Run this:
fetch('https://your-backend-url.com/api/')
  .then(r => r.json())
  .then(data => console.log('API Response:', data));

// Then check server logs to see what environment was logged
```

## Common Issues and Solutions

### Issue 1: "I set NODE_ENV but it's still not working"
**Solution:** Make sure you restarted the server after setting the environment variable.

### Issue 2: "I don't have access to set environment variables"
**Solution:** Contact your hosting provider or system administrator to set `NODE_ENV=production`.

### Issue 3: "Payment works on public link but not in 'Book a Session' tab"
**Solution:** Both flows use the same backend logic now. If one works and the other doesn't after setting NODE_ENV=production, check:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

### Issue 4: "I'm testing locally and want to test production behavior"
**Solution:** 
1. Create a separate `.env.production` file:
   ```
   NODE_ENV=production
   PORT=5001
   DATABASE_URL=your_db_url
   RAZORPAY_KEY_ID=your_key
   RAZORPAY_KEY_SECRET=your_secret
   ```
2. Run with: `NODE_ENV=production node src/server.js`
3. Test on `http://localhost:5001`

## What Happens in Each Environment

### Development (NODE_ENV=development or not set)
- ✓ Payment bypass enabled (for testing)
- ✓ Detailed error messages
- ✓ Stack traces in errors
- ✗ Not suitable for production

### Production (NODE_ENV=production)
- ✓ Payment ALWAYS required (when fee > 0)
- ✓ Secure error messages (no stack traces)
- ✓ Proper payment processing
- ✓ Ready for real customers

## Need Help?

If you're still having issues after setting NODE_ENV=production:

1. **Check server logs** - Look for the "Environment: production" message
2. **Check browser console** - Look for any JavaScript errors
3. **Check network tab** - See what the API is returning
4. **Share the logs** - Send the server startup logs and any error messages

## Final Checklist

- [ ] NODE_ENV=production is set on production server
- [ ] Server has been restarted after setting NODE_ENV
- [ ] Server logs show "Environment: production"
- [ ] Tested booking with Rs. 1 fee - Razorpay modal appears
- [ ] Completed a test payment successfully
- [ ] Verified payment appears in Razorpay dashboard
- [ ] Tested free booking (fee = 0) still works
- [ ] Public booking link still works correctly

Once all checkboxes are complete, your production payment flow is working correctly! 🎉
