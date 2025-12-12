# Email Connection Timeout Troubleshooting Guide

## Problem
When creating a new partner in the organization dashboard, you're getting a connection timeout error:
```
Error sending partner verification email: Error: Connection timeout
code: 'ETIMEDOUT', command: 'CONN'
```

## Root Causes & Solutions

### 1. Missing or Incorrect EMAIL_HOST Configuration

**Check:** Verify that `EMAIL_HOST` is set correctly in your environment variables.

**For Gmail:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**For Other Providers:**
- **Outlook/Hotmail:** `smtp-mail.outlook.com`
- **SendGrid:** `smtp.sendgrid.net`
- **Mailgun:** `smtp.mailgun.org`

**Solution:** 
1. Verify `EMAIL_HOST` is set in your `.env` file (local) or environment variables (production)
2. Ensure there are no typos in the hostname
3. Restart your backend server after making changes

---

### 2. Network/Firewall Blocking SMTP Connections

**On Render/Cloud Platforms:**
- Some hosting providers block outbound SMTP connections on port 587
- Port 25 is often blocked entirely

**Solutions:**

**Option A: Use Port 465 (SSL) instead of 587 (TLS)**
```env
EMAIL_PORT=465
```
The code will automatically detect port 465 and use secure connections.

**Option B: Use an Email Service Provider API**
Instead of SMTP, use a service like:
- **SendGrid** (recommended for production)
- **Mailgun**
- **AWS SES**

These use HTTP APIs that aren't blocked by firewalls.

**SendGrid Example:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

---

### 3. DNS Resolution Issues

**Symptom:** Error like `ENOTFOUND` or `EAI_AGAIN`

**Solution:**
- Verify the SMTP hostname is correct
- Try using IP address (not recommended, but for testing)
- Check if DNS is resolving correctly: `nslookup smtp.gmail.com`

---

### 4. Connection Timeout Too Short

**What We Fixed:**
The email service now has configurable timeouts:
- Connection timeout: 10 seconds (default)
- Greeting timeout: 5 seconds (default)
- Socket timeout: 30 seconds (default)

**Customize Timeouts (Optional):**
Add to your `.env`:
```env
EMAIL_CONNECTION_TIMEOUT=15000  # 15 seconds
EMAIL_GREETING_TIMEOUT=10000    # 10 seconds
EMAIL_SOCKET_TIMEOUT=60000      # 60 seconds
```

---

## Verification Steps

### Step 1: Check Environment Variables

**Local Development:**
```bash
cd backend
cat .env | grep EMAIL
```

**Production (Render/Other platforms):**
- Check your environment variables in the dashboard
- Ensure all required variables are set:
  - `EMAIL_HOST`
  - `EMAIL_PORT`
  - `EMAIL_USER`
  - `EMAIL_PASSWORD`
  - `EMAIL_FROM` (optional)

### Step 2: Test Email Configuration

Run the test script:
```bash
cd backend
node test-email-config.js
```

**Expected Output (Success):**
```
✅ Connection SUCCESSFUL!
Email service is properly configured.
```

**Expected Output (Failure):**
```
❌ Connection FAILED
Error: Connection timeout
```

### Step 3: Check Logs

When creating a partner, check the backend logs. You should now see detailed error information:

```
Error sending partner verification email: Connection timeout: Unable to connect to email server...
Connection error details: {
  code: 'CONN',
  host: 'smtp.gmail.com',
  port: '587',
  message: 'Connection timeout'
}
```

---

## Quick Fixes

### Fix 1: Use Gmail App Password (If Using Gmail)

1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password for "Mail"
3. Use that 16-character password (no spaces) in `EMAIL_PASSWORD`

### Fix 2: Try Port 465 (SSL)

Update your `.env`:
```env
EMAIL_PORT=465
```

### Fix 3: Use SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com
2. Create an API key
3. Configure environment variables:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### Fix 4: Test on Different Network

If you're behind a corporate firewall:
- Try from a different network (mobile hotspot)
- Or use a VPN
- Or configure firewall to allow SMTP connections

---

## What Changed in the Code

### Improved Error Handling
- More descriptive error messages
- Detailed logging of connection errors
- Partner creation still succeeds even if email fails
- Email status is reported in the API response

### Connection Options
- Configurable connection timeouts
- Connection pooling enabled
- Better TLS configuration
- Socket timeout options

### Better Logging
- Detailed error information logged
- Connection details included in error logs
- Email status tracked in responses

---

## Testing After Fix

1. **Update environment variables** with correct SMTP settings
2. **Restart backend server** to load new configuration
3. **Test email configuration:**
   ```bash
   cd backend
   node test-email-config.js
   ```
4. **Create a test partner** in the organization dashboard
5. **Check logs** for any remaining errors
6. **Verify email** was received by the partner

---

## Still Having Issues?

1. **Check backend logs** for detailed error messages
2. **Verify environment variables** are correctly set
3. **Test SMTP connection** from the server:
   ```bash
   telnet smtp.gmail.com 587
   ```
4. **Try alternative email provider** (SendGrid, Mailgun)
5. **Check hosting provider documentation** for SMTP restrictions
6. **Contact hosting support** if port 587 is blocked

---

## Important Notes

- **Partner creation will still succeed** even if email fails
- You can use the "Resend Verification Email" button to retry sending
- Email errors are logged with detailed information for debugging
- Consider using a dedicated email service (SendGrid, Mailgun) for production

---

## Common Email Provider Settings

### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
```

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
```

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your_mailgun_smtp_username
EMAIL_PASSWORD=your_mailgun_smtp_password
EMAIL_FROM=noreply@yourdomain.com
```

---

**Last Updated:** After implementing improved timeout handling and error messages
























