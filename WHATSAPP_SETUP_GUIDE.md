# WhatsApp Integration Setup Guide

This guide will help you set up WhatsApp notifications using Vonage (formerly Nexmo) API.

## Important: Authentication Method

Vonage Messages API v1 supports two authentication methods:

1. **JWT Authentication (Recommended)** - Required if your WhatsApp number is linked to a Vonage application
2. **Basic Authentication** - Only works if your WhatsApp number is NOT linked to an application

**Most users will need JWT authentication** because WhatsApp numbers are typically linked to applications in Vonage.

## Prerequisites

- A Vonage account (sign up at https://dashboard.nexmo.com/)
- A WhatsApp Business number configured in Vonage

## Setup Steps

### 1. Create a Vonage Application

1. Log in to your [Vonage Dashboard](https://dashboard.nexmo.com/)
2. Navigate to **Applications** in the left sidebar
3. Click **Create a new application**
4. Fill in the application details:
   - **Application name**: e.g., "TheraP Track WhatsApp"
   - **Capabilities**: Enable **Messages**
   - Set webhook URLs (you can use placeholder URLs like `https://example.com/webhooks/inbound` and `https://example.com/webhooks/status`)
5. Click **Generate new application**
6. **IMPORTANT**: Download and save the private key file - you won't be able to download it again!
7. Copy the **Application ID** - you'll need this

### 2. Link Your WhatsApp Number to the Application

1. In the Vonage Dashboard, go to **Numbers** → **Your numbers**
2. Find your WhatsApp Business number
3. Click **Edit** next to the number
4. Under **Messages**, select your application from the dropdown
5. Click **Save**

### 3. Configure Environment Variables

Add the following to your backend `.env` file:

```env
# WhatsApp Configuration
WHATSAPP_ENABLED=true
VONAGE_WHATSAPP_NUMBER=+919655846492  # Your WhatsApp Business number in E.164 format

# JWT Authentication (Recommended - use this if your number is linked to an application)
VONAGE_APPLICATION_ID=your_application_id_here
VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Your private key content here
(multiple lines)
-----END PRIVATE KEY-----"

# Basic Authentication (Only if number is NOT linked to an application)
# VONAGE_API_KEY=your_api_key_here
# VONAGE_API_SECRET=your_api_secret_here

# Optional: Sandbox mode (for testing)
# VONAGE_SANDBOX=true
```

#### How to Set the Private Key

The private key must be properly formatted for the Vonage SDK to work. Here are the correct ways to set it:

**Option 1: Multi-line string in .env (Recommended for local development)**

Open your `.env` file and paste the private key exactly as it appears in the downloaded file:

```env
VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
7xQWZqFZ8z9mJ5xK8dR2YvN3pL4wX5yH9jK2mN8pQ6rS7tU9vW
(multiple lines of the actual key content)
xYzA1bC2dD3eE4fF5gG6hH7iI8jJ9kK0lL1mM2nN3oO4pP5qQ
-----END PRIVATE KEY-----"
```

**Important**: Keep the actual newlines - don't replace them with `\n`.

**Option 2: Single line with literal \n (For production/environment variables)**

If your hosting platform doesn't support multi-line environment variables, use this format:

```env
VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7xQWZqFZ8z9mJ5xK8dR2YvN3pL4wX5yH9jK2mN8pQ6rS7tU9vW...(all on one line)...\n-----END PRIVATE KEY-----"
```

Replace actual newlines with `\n` (the two characters: backslash + n).

**Option 3: Load from file (Most secure for production)**

Store the private key in a separate file and reference it:

1. Save your private key to a file: `vonage_private.key`
2. In your code, read it: `VONAGE_PRIVATE_KEY=$(cat /path/to/vonage_private.key)`

**Common Mistakes to Avoid:**
- ❌ Missing the `-----BEGIN PRIVATE KEY-----` header
- ❌ Missing the `-----END PRIVATE KEY-----` footer  
- ❌ Extra spaces or characters before/after the key
- ❌ Corrupted key content (copy the entire file, don't edit it)
- ❌ Using the wrong key file (make sure it's the one Vonage generated)

### 4. Restart Your Server

After updating the `.env` file, restart your backend server:

```bash
cd backend
npm start
```

### 5. Test the Integration

1. Log in to your admin panel
2. Navigate to **Settings** → **WhatsApp**
3. Enter a test phone number (in E.164 format, e.g., +919876543210)
4. Click **Send Test Message**

## Troubleshooting

### Error: secretOrPrivateKey must be an asymmetric key when using RS256

This error means the private key format is incorrect. The Vonage SDK cannot parse it.

**Solutions:**

1. **Check the private key format in your `.env` file:**
   ```env
   # ✅ CORRECT - Multi-line format
   VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
   -----END PRIVATE KEY-----"
   
   # ✅ CORRECT - Single line with \n
   VONAGE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----"
   
   # ❌ WRONG - Missing quotes
   VONAGE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   ...
   
   # ❌ WRONG - Missing BEGIN/END markers
   VONAGE_PRIVATE_KEY="MIIEvQIBADANBgkqhkiG9w0BAQEFAASC..."
   ```

2. **Re-download the private key from Vonage:**
   - Go to Vonage Dashboard → Applications
   - If you lost the original key, you'll need to generate a new application
   - Download the `.key` file
   - Copy the ENTIRE content (including BEGIN/END lines)

3. **Verify the key in your production environment:**
   - Check that environment variables are properly set
   - Some platforms (Heroku, Vercel, etc.) may need special formatting
   - Try the single-line format with `\n` if multi-line doesn't work

4. **Restart your server** after fixing the key format

### Error: 401 Unauthorized

This means your authentication credentials are incorrect. Check:

**If using JWT authentication:**
- ✅ `VONAGE_APPLICATION_ID` is correct
- ✅ `VONAGE_PRIVATE_KEY` is the complete private key (including BEGIN/END markers)
- ✅ Your WhatsApp number is linked to the correct application
- ✅ The application has not been deleted or disabled
- ✅ You've restarted the server after updating `.env`

**If using Basic Auth:**
- ✅ Your WhatsApp number is NOT linked to any application (unlink it in Vonage Dashboard)
- ✅ `VONAGE_API_KEY` is correct
- ✅ `VONAGE_API_SECRET` is correct
- ✅ You've restarted the server after updating `.env`

**Common mistake**: If your number is linked to an application, you MUST use JWT authentication. Basic Auth will fail with 401.

### Error: 422 Unprocessable Entity

**In Sandbox Mode:**
- The recipient number needs to be registered in your Vonage WhatsApp sandbox
- Go to: Dashboard → Messages and Dispatch → Sandbox → WhatsApp
- Add the recipient number (without the + sign)

**In Production Mode:**
- The recipient must initiate a conversation first (24-hour messaging window)
- Ask the recipient to send a WhatsApp message to your business number
- After they message you, you have 24 hours to send them messages

### Error: Invalid phone number format

- Phone numbers must be in E.164 format: `+[country code][number]`
- Examples:
  - ✅ Correct: `+919876543210` (India)
  - ✅ Correct: `+14155552671` (US)
  - ❌ Wrong: `9876543210` (missing country code)
  - ❌ Wrong: `+91 98765 43210` (contains spaces)

### Server logs show "WhatsApp service is disabled"

Check:
- `WHATSAPP_ENABLED=true` is set in your `.env` file
- You have either JWT credentials (APPLICATION_ID + PRIVATE_KEY) or Basic Auth credentials (API_KEY + API_SECRET)
- `VONAGE_WHATSAPP_NUMBER` is set
- You've restarted the server

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `WHATSAPP_ENABLED` | Yes | Enable/disable WhatsApp service | `true` |
| `VONAGE_WHATSAPP_NUMBER` | Yes | Your WhatsApp Business number | `+919655846492` |
| `VONAGE_APPLICATION_ID` | JWT only | Your Vonage application ID | `abc123-def456-...` |
| `VONAGE_PRIVATE_KEY` | JWT only | Your application's private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `VONAGE_API_KEY` | Basic only | Your Vonage API key | `abc12345` |
| `VONAGE_API_SECRET` | Basic only | Your Vonage API secret | `AbCdEfGhIjKlMnOp` |
| `VONAGE_SANDBOX` | Optional | Use sandbox mode for testing | `true` or `false` |

## Which Authentication Method Should I Use?

### Use JWT Authentication if:
- ✅ Your WhatsApp number is linked to a Vonage application (most common)
- ✅ You're setting up WhatsApp for the first time
- ✅ You want to use advanced features

### Use Basic Authentication if:
- ✅ Your WhatsApp number is NOT linked to any application
- ✅ You specifically unlinked it for testing purposes

**When in doubt, use JWT authentication** - it's the recommended method for WhatsApp Business API.

## Getting Help

If you're still having issues:

1. Check the backend server logs for detailed error messages
2. Verify your credentials in the [Vonage Dashboard](https://dashboard.nexmo.com/)
3. Check the [Vonage API Documentation](https://developer.vonage.com/en/messages/overview)
4. Contact Vonage Support for account-specific issues

## Security Notes

- Never commit your `.env` file to version control
- Keep your private key secure - treat it like a password
- Rotate your credentials periodically
- Use environment-specific credentials for development/staging/production

