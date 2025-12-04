# Fix Email Issue - Step by Step Guide

## Problem Identified

The error "Failed to send password reset email" is caused by **invalid email credentials** in your `.env` file.

Current issue: Your `.env` file has placeholder values:
- EMAIL_USER=your_email@gmail.com (placeholder)
- EMAIL_PASSWORD=your_16_char_app_password (placeholder)

## Solution: Configure Real Gmail Credentials

### Step 1: Get Gmail App Password

1. **Go to Google Account Security**
   - Visit: https://myaccount.google.com/security

2. **Enable 2-Step Verification** (if not already enabled)
   - Click on "2-Step Verification"
   - Follow the setup wizard
   - This is REQUIRED for App Passwords

3. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or search for "App Passwords" in your Google Account settings
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Type "Therapy Tracker"
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 2: Update .env File

Open `backend/.env` and update these lines:

```env
# Replace with YOUR actual Gmail address
EMAIL_USER=your.actual.email@gmail.com

# Replace with the 16-character App Password (no spaces)
EMAIL_PASSWORD=abcdefghijklmnop
```

**Important:**
- Use your REAL Gmail address
- Use the App Password (16 characters, no spaces)
- Do NOT use your regular Gmail password

### Step 3: Restart Backend Server

The server needs to be restarted to load the new environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
npm start
```

Or if using dev mode:
```bash
npm run dev
```

### Step 4: Test Email Service

Run the test script to verify:

```bash
cd backend
node test_email.js
```

Expected output:
```
✓ Email service verification SUCCESSFUL!

The email service is properly configured and ready to use.
You can now use the forgot password feature.
```

### Step 5: Test Forgot Password Feature

1. Go to http://localhost:3000/login
2. Click "Forgot Password?"
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email inbox
6. You should receive the password reset email

## Alternative: Use Different Email Provider

If you don't want to use Gmail, you can use other providers:

### Option 1: SendGrid (Recommended for Production)

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Option 2: Mailgun

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your_mailgun_smtp_username
EMAIL_PASSWORD=your_mailgun_smtp_password
EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_outlook_password
EMAIL_FROM=your_email@outlook.com
```

## Troubleshooting

### Still Getting "Invalid login" Error?

1. **Double-check credentials:**
   - Make sure EMAIL_USER is your actual Gmail address
   - Make sure EMAIL_PASSWORD is the App Password (not regular password)
   - Remove any spaces from the App Password

2. **Verify 2-Step Verification is enabled:**
   - App Passwords only work with 2-Step Verification enabled

3. **Generate a new App Password:**
   - Sometimes old passwords stop working
   - Delete the old one and generate a new one

4. **Check for typos:**
   - Copy-paste the App Password to avoid typos
   - Make sure there are no extra spaces or quotes

### "Less secure app access" Error?

- This is an old setting that no longer works
- You MUST use App Passwords with 2-Step Verification
- Google removed "less secure apps" option in 2022

### Firewall Blocking SMTP?

If you get connection timeout errors:
1. Check if your firewall is blocking port 587
2. Try using port 465 with secure connection:
   ```env
   EMAIL_PORT=465
   ```

### Testing with a Different Email

You can test with a temporary email service:
1. Use Ethereal Email (for testing only): https://ethereal.email/
2. Create a test account
3. Use those credentials in .env
4. Check emails at ethereal.email

## Quick Reference

### Current Configuration Check
```bash
cd backend
node check_email_config.js
```

### Test Email Service
```bash
cd backend
node test_email.js
```

### Restart Backend
```bash
cd backend
npm start
```

## Summary

The issue is that your `.env` file has placeholder email credentials. Follow these steps:

1. ✅ Enable 2-Step Verification in Google Account
2. ✅ Generate App Password at https://myaccount.google.com/apppasswords
3. ✅ Update EMAIL_USER and EMAIL_PASSWORD in backend/.env
4. ✅ Restart backend server
5. ✅ Run test: `node test_email.js`
6. ✅ Try forgot password feature

Once you complete these steps, the forgot password feature will work perfectly!























