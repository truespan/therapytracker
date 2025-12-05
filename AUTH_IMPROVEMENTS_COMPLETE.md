# Authentication & UI Improvements - Implementation Complete

## Overview

Successfully implemented three major improvements to the authentication system:
1. Mobile number login support
2. Compact country code field in signup
3. Email-based forgot password functionality

## 1. Mobile Number Login Support

### Backend Changes

**File: `backend/src/models/Auth.js`**
- Added `findByEmailOrPhone(identifier)` method
- Searches auth_credentials by email first
- If not found, searches users/partners/organizations tables by contact field
- Returns matching auth record with proper user type

**File: `backend/src/controllers/authController.js`**
- Updated `login()` function to accept email OR phone number
- Uses `Auth.findByEmailOrPhone()` for flexible authentication
- Updated error messages to be generic ("Invalid credentials")

### Frontend Changes

**File: `frontend/src/pages/Login.jsx`**
- Changed input type from `email` to `text`
- Updated label to "Email or Phone Number"
- Updated placeholder to show both formats
- Removed email-only validation

### Usage

Users can now login with either:
- Email: `user@example.com`
- Phone: `+919876543210`

## 2. Compact Country Code Field

### Changes

**File: `frontend/src/pages/Signup.jsx`**
- Reduced country code selector width from `w-32` to `w-24`
- Added `text-sm` and `px-2` classes for compact styling
- Flag emojis still display properly

### Result

The country code dropdown is now more compact and takes up less horizontal space, improving the form layout.

## 3. Forgot Password Feature

### Database Migration

**File: `backend/database/migration_password_reset.sql`**
- Created `password_reset_tokens` table
- Columns: id, email, token, expires_at, created_at
- Indexes on token and email for fast lookups
- Tokens expire after 1 hour

**To apply migration:**
```bash
cd backend
psql -U your_username -d therapy_tracker -f database/migration_password_reset.sql
```

### Backend Implementation

**File: `backend/src/models/PasswordReset.js`** (NEW)
- `createToken(email)` - Generates secure token with 1-hour expiry
- `findByToken(token)` - Validates token exists and not expired
- `deleteToken(token)` - Removes used token
- `deleteByEmail(email)` - Cleans up old tokens for email
- `deleteExpiredTokens()` - Cleanup utility

**File: `backend/src/utils/emailService.js`** (NEW)
- Configured nodemailer for SMTP
- `sendPasswordResetEmail(email, token)` - Sends HTML email
- Beautiful email template with reset link
- Uses environment variables for configuration

**File: `backend/src/controllers/authController.js`**
- Added `forgotPassword(req, res)` endpoint
  - Accepts email or phone number
  - Finds user by email/phone
  - Generates reset token
  - Sends email with reset link
  - Returns success message (doesn't reveal if user exists)
- Added `resetPassword(req, res)` endpoint
  - Validates token
  - Validates new password (min 6 characters)
  - Updates password hash
  - Deletes used token
  - Returns success

**File: `backend/src/routes/index.js`**
- Added `POST /api/auth/forgot-password`
- Added `POST /api/auth/reset-password`

### Frontend Implementation

**File: `frontend/src/pages/ForgotPassword.jsx`** (NEW)
- Form to enter email or phone number
- Submit button to request reset link
- Success/error message display
- Link back to login page

**File: `frontend/src/pages/ResetPassword.jsx`** (NEW)
- Extracts token from URL query parameter
- Form with new password and confirm password fields
- Password validation (match and length)
- Submits to reset endpoint
- Auto-redirects to login after success

**File: `frontend/src/pages/Login.jsx`**
- Added "Forgot Password?" link next to password label
- Links to `/forgot-password` route

**File: `frontend/src/App.jsx`**
- Added `/forgot-password` route
- Added `/reset-password` route
- Both routes redirect to dashboard if user is logged in

**File: `frontend/src/services/api.js`**
- Added `forgotPassword(identifier)` API call
- Added `resetPassword(token, newPassword)` API call

### Email Configuration

**Required Environment Variables:**

Add these to your `backend/.env` file:

```env
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Therapy Tracker <noreply@therapytracker.com>

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:3000
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an "App Password" for nodemailer
3. Use the app password in EMAIL_PASSWORD

**For other providers:**
- Update EMAIL_HOST and EMAIL_PORT accordingly
- Common providers: SendGrid, Mailgun, AWS SES, etc.

### Password Reset Flow

1. **User requests reset:**
   - Goes to `/forgot-password`
   - Enters email or phone number
   - Clicks "Send Reset Link"

2. **Backend processes:**
   - Finds user by email/phone
   - Generates secure token
   - Stores token in database (1-hour expiry)
   - Sends email with reset link

3. **User receives email:**
   - Opens email
   - Clicks reset link
   - Redirected to `/reset-password?token=xxx`

4. **User resets password:**
   - Enters new password
   - Confirms password
   - Clicks "Reset Password"

5. **Backend updates:**
   - Validates token
   - Updates password hash
   - Deletes used token
   - Returns success

6. **User redirected:**
   - Auto-redirects to login page
   - Can login with new password

## Security Features

### Mobile Login
- Generic error messages prevent user enumeration
- Same authentication flow as email login

### Password Reset
- Tokens expire after 1 hour
- Secure token generation using crypto.randomBytes()
- One-time use tokens (deleted after use)
- Generic success message (doesn't reveal if email exists)
- Old tokens deleted when new reset requested
- HTTPS recommended for production

## API Endpoints

### New Endpoints

```
POST /api/auth/forgot-password
Body: { "identifier": "email@example.com or +919876543210" }
Response: { "message": "If an account exists..." }

POST /api/auth/reset-password
Body: { "token": "xxx", "newPassword": "newpass123" }
Response: { "message": "Password reset successful..." }
```

### Modified Endpoints

```
POST /api/auth/login
Body: { "email": "email@example.com or +919876543210", "password": "xxx" }
Response: { "token": "jwt", "user": {...} }
```

## Testing Guide

### Test Mobile Login

1. **Create account with phone number:**
   - Signup with email and phone
   - Note the phone number (e.g., +919876543210)

2. **Login with phone:**
   - Go to login page
   - Enter phone number: `+919876543210`
   - Enter password
   - Should login successfully

3. **Login with email:**
   - Logout
   - Login with email instead
   - Should also work

### Test Compact Country Code

1. Go to signup page
2. Check country code dropdown
3. Should be narrower than before
4. Flag emojis should still display
5. Should be easy to read

### Test Forgot Password

**Prerequisites:**
- Configure email service in backend/.env
- Restart backend server

**Test Flow:**

1. **Request reset:**
   - Go to login page
   - Click "Forgot Password?"
   - Enter email or phone number
   - Click "Send Reset Link"
   - Should see success message

2. **Check email:**
   - Open email inbox
   - Should receive password reset email
   - Email should have reset link

3. **Reset password:**
   - Click link in email
   - Should open reset password page
   - Enter new password (min 6 characters)
   - Confirm password
   - Click "Reset Password"
   - Should see success message
   - Should redirect to login

4. **Login with new password:**
   - Enter email/phone
   - Enter NEW password
   - Should login successfully

5. **Test expired token:**
   - Request another reset
   - Wait 1+ hour
   - Try to use old link
   - Should show "expired token" error

6. **Test invalid token:**
   - Try random token in URL
   - Should show error

## Troubleshooting

### Email Not Sending

**Check configuration:**
```bash
# In backend/.env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**For Gmail:**
- Enable 2FA in Google account
- Generate App Password
- Use App Password, not regular password

**Check logs:**
```bash
# Backend console should show:
Password reset email sent: <message-id>
```

**Test email service:**
```bash
cd backend
node -e "const { sendPasswordResetEmail } = require('./src/utils/emailService'); sendPasswordResetEmail('test@example.com', 'test-token').then(() => console.log('Success')).catch(err => console.error(err));"
```

### Mobile Login Not Working

**Check database:**
```sql
-- Verify contact is stored with country code
SELECT id, email, contact FROM users WHERE contact LIKE '+%';
SELECT id, email, contact FROM partners WHERE contact LIKE '+%';
```

**Check format:**
- Phone must start with `+`
- Format: `+[country code][number]`
- Example: `+919876543210`

### Password Reset Link Not Working

**Check token in database:**
```sql
SELECT * FROM password_reset_tokens WHERE email = 'user@example.com';
```

**Check expiry:**
```sql
SELECT *, expires_at > NOW() as is_valid FROM password_reset_tokens;
```

**Check frontend URL:**
```bash
# In backend/.env
FRONTEND_URL=http://localhost:3000
```

## Files Created

### Backend
- `backend/database/migration_password_reset.sql`
- `backend/src/models/PasswordReset.js`
- `backend/src/utils/emailService.js`

### Frontend
- `frontend/src/pages/ForgotPassword.jsx`
- `frontend/src/pages/ResetPassword.jsx`

## Files Modified

### Backend
- `backend/src/models/Auth.js`
- `backend/src/controllers/authController.js`
- `backend/src/routes/index.js`

### Frontend
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Signup.jsx`
- `frontend/src/App.jsx`
- `frontend/src/services/api.js`

## Dependencies

All required dependencies are already installed:
- Backend: bcrypt, jsonwebtoken, nodemailer (needs to be installed)
- Frontend: react-router-dom, axios

**Install nodemailer:**
```bash
cd backend
npm install nodemailer
```

## Summary

All three features have been successfully implemented:

1. **Mobile Login** - Users can login with phone number or email
2. **Compact Country Code** - Signup form is more compact and clean
3. **Forgot Password** - Complete email-based password reset flow

The system is secure, user-friendly, and production-ready (with proper email configuration).


























