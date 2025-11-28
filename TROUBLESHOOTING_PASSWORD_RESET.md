# Password Reset Troubleshooting Guide

## Issue
Users `ashakumark1991@gmail.com` and `krishnagamganesha@gmail.com` are getting "Failed to process request. Please try again." error when trying to reset their passwords.

## Investigation Results

### ✅ Backend System Status
- **Database**: Users exist and are properly configured
- **Email Service**: Working correctly (Gmail SMTP configured)
- **Password Reset Logic**: Tested and working perfectly
- **API Endpoint**: `/api/auth/forgot-password` is functional

### ❌ Problem Identified
The error message "Failed to process request. Please try again." appears when:
1. **Backend server is not running**
2. **Frontend cannot connect to backend** (network/CORS issue)
3. **API URL is misconfigured** in frontend

## Solutions

### Solution 1: Ensure Backend Server is Running

**Check if server is running:**
```bash
# In a new terminal
cd backend
npm run dev
```

The server should show:
```
Server is running on port 5000
Connected to PostgreSQL database
```

**Keep this terminal open** while using the application.

### Solution 2: Check Frontend API Configuration

Verify the frontend is pointing to the correct backend URL:

**File**: `frontend/.env` or `frontend/.env.local`

Should contain:
```
REACT_APP_API_URL=http://localhost:5000/api
```

If this file doesn't exist, create it with the above content.

### Solution 3: Test the Connection

**Test if backend is accessible:**
```bash
# Open browser and go to:
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "..."
}
```

If you get "Cannot connect" or timeout, the backend is not running.

### Solution 4: Manual Password Reset (Immediate Access)

If users need immediate access, reset passwords manually:

```bash
cd backend

# For ashakumark1991@gmail.com
node -e "require('dotenv').config(); const bcrypt = require('bcrypt'); const db = require('./src/config/database'); (async () => { const hash = await bcrypt.hash('TempPassword123', 10); await db.query('UPDATE auth_credentials SET password_hash = \$1 WHERE email = \$2', [hash, 'ashakumark1991@gmail.com']); console.log('✅ Password reset for ashakumark1991@gmail.com'); console.log('New password: TempPassword123'); await db.end(); })()"

# For krishnagamganesha@gmail.com
node -e "require('dotenv').config(); const bcrypt = require('bcrypt'); const db = require('./src/config/database'); (async () => { const hash = await bcrypt.hash('TempPassword123', 10); await db.query('UPDATE auth_credentials SET password_hash = \$1 WHERE email = \$2', [hash, 'krishnagamganesha@gmail.com']); console.log('✅ Password reset for krishnagamganesha@gmail.com'); console.log('New password: TempPassword123'); await db.end(); })()"
```

Both users can then login with:
- **Password**: `TempPassword123`

They should change this password after logging in.

## Step-by-Step Fix

### Step 1: Start Backend Server
```bash
cd backend
npm run dev
```

**Leave this terminal open!**

### Step 2: Start Frontend (in a new terminal)
```bash
cd frontend
npm start
```

### Step 3: Test Password Reset
1. Go to http://localhost:3000/forgot-password
2. Enter: `krishnagamganesha@gmail.com`
3. Click "Send Reset Link"
4. Should see success message
5. Check email inbox (and spam folder)

## Verification Checklist

- [ ] Backend server is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] Can access http://localhost:5000/api/health
- [ ] No CORS errors in browser console (F12)
- [ ] Email service is configured in backend/.env

## Common Issues

### Issue: "Network Error" in browser console
**Solution**: Backend server is not running. Start it with `npm run dev`

### Issue: "CORS Error" in browser console
**Solution**: Ensure backend has CORS enabled (it should be by default)

### Issue: Email not received
**Solutions**:
1. Check spam folder
2. Verify email configuration in backend/.env
3. Gmail may require "App Password" instead of regular password

### Issue: "Invalid credentials" after password reset
**Solution**: Use the manual password reset method above

## Email Configuration (For Reference)

Backend email is configured with:
- **SMTP Host**: smtp.gmail.com
- **Email**: santechs111@gmail.com
- **Port**: 587 (TLS)
- **Status**: ✅ Working

## User Information

### User 1: ashakumark1991@gmail.com
- **Name**: Asha Pareek
- **Contact**: +919742991324
- **Status**: ✅ Account exists
- **Created**: November 20, 2025

### User 2: krishnagamganesha@gmail.com
- **Name**: Sriram
- **Contact**: +919742991324
- **Status**: ✅ Account exists
- **Created**: November 20, 2025

## Quick Fix Commands

### Reset both passwords at once:
```bash
cd backend
node -e "require('dotenv').config(); const bcrypt = require('bcrypt'); const db = require('./src/config/database'); (async () => { const hash = await bcrypt.hash('TempPassword123', 10); await db.query('UPDATE auth_credentials SET password_hash = \$1 WHERE email IN (\$2, \$3)', [hash, 'ashakumark1991@gmail.com', 'krishnagamganesha@gmail.com']); console.log('✅ Passwords reset for both users'); console.log('New password: TempPassword123'); await db.end(); })()"
```

### Test password reset email:
```bash
cd backend
node -e "require('dotenv').config(); const { sendPasswordResetEmail } = require('./src/utils/emailService'); (async () => { await sendPasswordResetEmail('krishnagamganesha@gmail.com', 'test-token-123'); console.log('✅ Test email sent'); process.exit(0); })()"
```

## Support

If issues persist after following this guide:
1. Check backend server logs for errors
2. Check browser console (F12) for frontend errors
3. Verify database connection is working
4. Ensure all environment variables are set correctly












