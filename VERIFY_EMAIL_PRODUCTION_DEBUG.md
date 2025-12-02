# Email Verification Production Debugging Guide

## Current Status
✅ VerifyEmail page loads (routing fixed)
❌ Email not verified in database (backend API call failing)

## Critical Checks Required

### Step 1: Check Browser Console Logs

After clicking the verification link, open browser DevTools (F12) and check the Console tab for these logs:

**Expected logs you should see:**
```
VerifyEmail component rendered!
🔵 Current URL: https://therapytracker-frontend.onrender.com/verify-email?token=...&type=partner
🔵 Calling backend API to verify email...
🔵 Token: ab930349f1...
🔵 Type: partner
[API Debug] Request to: /auth/verify-email | Token present: true/false
[API Debug] Full URL: https://therapytracker-backend.onrender.com/api/auth/verify-email
[API Debug] Method: get
[API Debug] Params: {token: "...", type: "partner"}
[API Debug] Response success: /auth/verify-email | Status: 200
✅ Verification API response: {message: "...", partner: {...}}
✅ Email verified successfully! Partner: ...
✅ Redirecting to login page in 3 seconds...
```

**If you see errors instead:**
```
❌ Email verification error: ...
❌ Error response: ...
❌ Error status: ...
[API Debug] Response error: /auth/verify-email
[API Debug] Error status: 404/500/400
[API Debug] Error data: ...
```

### Step 2: Check Network Tab

1. Open DevTools (F12) → Network tab
2. Reload the verification page (or click the link again)
3. Look for a request to `/auth/verify-email`

**What to check:**
- **Request URL**: Should be `https://therapytracker-backend.onrender.com/api/auth/verify-email?token=...&type=partner`
- **Method**: GET
- **Status**: Should be 200 (success)
- **Response**: Should have `{message: "...", partner: {email_verified: true, ...}}`

**Common issues:**

#### Issue 1: Wrong API URL
**Request URL shows**: `http://localhost:5000/api/auth/verify-email`
**Problem**: REACT_APP_API_URL not set in production
**Solution**: Set environment variable in Render.com

#### Issue 2: 404 Not Found
**Status**: 404
**Problem**: Backend not running or URL incorrect
**Solution**: Check backend service is running on Render.com

#### Issue 3: CORS Error
**Console shows**: `Access to XMLHttpRequest blocked by CORS policy`
**Problem**: Backend CORS not allowing frontend domain
**Solution**: Backend needs to allow frontend origin

#### Issue 4: 500 Internal Server Error
**Status**: 500
**Problem**: Backend error (token invalid, database issue, etc.)
**Solution**: Check backend logs on Render.com

### Step 3: Verify Environment Variables on Render.com

**Frontend Service** (`therapytracker-frontend`):
1. Go to Render.com → Your Frontend Service → Environment
2. Check for `REACT_APP_API_URL`
3. **Should be**: `https://therapytracker-backend.onrender.com/api` (without trailing slash)
4. **NOT**: `http://localhost:5000/api`

**Backend Service** (`therapytracker-backend`):
1. Go to Render.com → Your Backend Service → Environment
2. Check these variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Your JWT secret
   - `BREVO_API_KEY` - Email service API key
   - `FRONTEND_URL` - `https://therapytracker-frontend.onrender.com` (no trailing slash)

### Step 4: Test Backend Directly

Open this URL in a new browser tab (replace TOKEN with your actual token from the email):
```
https://therapytracker-backend.onrender.com/api/auth/verify-email?token=YOUR_TOKEN_HERE&type=partner
```

**Expected Response** (if working):
```json
{
  "message": "Email verified successfully! You can now log in to your account.",
  "partner": {
    "id": 123,
    "partner_id": "AB12345",
    "name": "Partner Name",
    "email": "partner@example.com",
    "email_verified": true
  }
}
```

**If you get an error**:
- Check the error message in the response
- This will tell you if the problem is in the backend or the token

### Step 5: Check Backend Logs on Render.com

1. Go to Render.com → Your Backend Service → Logs
2. Look for these log lines when you click the verification link:
```
2024-XX-XX - GET /api/auth/verify-email
Verify email error: ... (if there's an error)
Email verified successfully for partner: ... (if successful)
```

**Common backend errors:**
- `Invalid or expired verification link` - Token expired (1 hour limit)
- `Failed to verify email` - Database connection issue
- `Token and type are required` - Parameters not received

### Step 6: Check Database Directly

If you have access to your PostgreSQL database:
```sql
SELECT id, partner_id, name, email, email_verified,
       verification_token, verification_token_expires
FROM partners
WHERE email = 'partner@example.com';
```

**Check:**
- `email_verified` - Should change from `f` to `t` after verification
- `verification_token` - Should match the token in the email link
- `verification_token_expires` - Should be in the future (not expired)

## Common Solutions

### Solution 1: REACT_APP_API_URL Not Set
```bash
# On Render.com Frontend Service:
# Environment → Add Environment Variable
Key: REACT_APP_API_URL
Value: https://therapytracker-backend.onrender.com/api

# Then redeploy frontend service
```

### Solution 2: Token Expired (1 hour limit)
- Use "Resend Verification Email" feature from organization dashboard
- This generates a new token with fresh expiry

### Solution 3: Backend Not Receiving Request
- Check backend service is running on Render.com
- Check backend logs for incoming requests
- Verify CORS is enabled (already done in code)

### Solution 4: CORS Issue
Backend `server.js` should have:
```javascript
app.use(cors()); // Already present
```

For production, you might want to restrict origins:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

## Quick Debug Commands

### Check if backend is accessible:
```bash
curl https://therapytracker-backend.onrender.com/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

### Test verify-email endpoint:
```bash
curl "https://therapytracker-backend.onrender.com/api/auth/verify-email?token=YOUR_TOKEN&type=partner"
```

## Files Modified for Better Debugging

### `frontend/src/services/api.js`
- Added detailed console logging for all API requests/responses
- Prevented auth token from being sent to public endpoints like verify-email
- Prevented auto-redirect to login on 401 for public endpoints

### `frontend/src/pages/VerifyEmail.jsx`
- Added detailed console logging for debugging
- Shows exact error messages from backend

## Next Steps After Identifying the Issue

### If REACT_APP_API_URL is wrong:
1. Set correct value in Render.com frontend environment
2. Redeploy frontend
3. Test again

### If token is expired:
1. Go to organization dashboard
2. Find the partner
3. Click "Resend Verification Email"
4. Use new link

### If backend has errors:
1. Check backend logs on Render.com
2. Share error message for further debugging
3. May need to check database connection or migrations

## Contact Info for Support

Please provide these details if you need help:
1. Screenshot of browser console (with all logs visible)
2. Screenshot of Network tab showing the verify-email request
3. Error message from backend logs (if any)
4. Current value of REACT_APP_API_URL in Render.com
5. Backend service status (running/crashed)

## Important Notes

- Verification tokens expire after 1 hour
- The verify-email endpoint is public (no authentication required)
- Email verification is idempotent (can click link multiple times)
- Organization user being logged in should not affect partner verification
- localStorage is shared across tabs on same domain (but this is now handled)
