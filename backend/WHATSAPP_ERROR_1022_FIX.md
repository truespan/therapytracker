# WhatsApp Error 1022 - Quick Fix Guide

## Problem
You're receiving **Error 1022** when sending WhatsApp template messages. Vonage Dashboard shows messages as "Rejected" with error code 1022.

## Root Cause
Error 1022 indicates a template configuration mismatch. The most common causes are:
1. **Locale Mismatch**: Using `en` instead of `en_US`
2. **Missing Namespace**: Not specifying your WhatsApp template namespace
3. **Parameter Count Mismatch**: Sending wrong number of parameters

## Immediate Fix

### Step 1: Get Your Template Details from WhatsApp Manager

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp Manager** > **Message Templates**
3. Click on your template (e.g., `theraptrack_appointment_is_booked`)
4. Note down these details:
   - **Template Name**: `theraptrack_appointment_is_booked`
   - **Language**: `English (US)` → This means locale is `en_US`
   - **Namespace**: Look for "Message Template Namespace" (e.g., `c0a5f8e8_a30e_41fd_9474_beea4345e9b5`)
   - **Parameter Count**: Count the `{{1}}`, `{{2}}`, etc. placeholders

### Step 2: Update Your Environment Variables

Add or update these variables in your production environment (e.g., Render, Heroku, etc.):

```env
# Template Namespace (REQUIRED - from WhatsApp Manager)
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5

# Template Locale (REQUIRED - must match your template language)
WHATSAPP_TEMPLATE_LOCALE=en_US

# Template Names
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED=theraptrack_appointment_cancelled

# Parameter Configuration
# Set to false if your template has 6 parameters (default)
# Set to true if your template has 7 parameters (includes payment status)
WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false
```

### Step 3: Restart Your Application

After updating environment variables, restart your application:

```bash
# If using Render
# Go to Dashboard → Your Service → Manual Deploy → Deploy Latest Commit

# If using PM2
pm2 restart all

# If using Docker
docker-compose restart
```

### Step 4: Test

1. Create a test appointment or booking
2. Check the logs for successful template sending
3. Verify in Vonage Dashboard that message status is "Delivered" (not "Rejected")

## Common Locale Codes

| Template Language | Locale Code |
|------------------|-------------|
| English (US) | `en_US` |
| English (UK) | `en_GB` |
| Hindi | `hi` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |

## Verification Checklist

- [ ] `WHATSAPP_TEMPLATE_NAMESPACE` is set to your namespace from WhatsApp Manager
- [ ] `WHATSAPP_TEMPLATE_LOCALE` matches your template language (e.g., `en_US`, not `en`)
- [ ] Template names match exactly (case-sensitive)
- [ ] `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS` matches your parameter count:
  - `false` for 6 parameters (default)
  - `true` for 7 parameters
- [ ] Application has been restarted after environment variable changes
- [ ] Templates are approved in WhatsApp Manager (green checkmark)

## Example: Your Current Setup

Based on your earlier message, here's what you should set:

```env
# Your WhatsApp Template Namespace (you mentioned this)
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5

# Your Template Language: English (US)
WHATSAPP_TEMPLATE_LOCALE=en_US

# Your Template Names (already set)
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED=theraptrack_appointment_cancelled

# Your Template Has 6 Parameters
WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false
```

## What Changed in the Code

The code has been updated to:

1. **Default Locale**: Changed from `en` to `en_US`
2. **Namespace Support**: Added `WHATSAPP_TEMPLATE_NAMESPACE` environment variable
3. **Automatic Namespace Prepending**: If namespace is set, it's automatically prepended to template names
4. **Configurable Locale**: Added `WHATSAPP_TEMPLATE_LOCALE` environment variable
5. **Enhanced Logging**: Shows namespace, locale, and full template name in logs

## Expected Log Output After Fix

```
[WhatsApp Template] Sending template message:
  - Template Name (original): theraptrack_appointment_is_booked
  - Template Name (with namespace): c0a5f8e8_a30e_41fd_9474_beea4345e9b5:theraptrack_appointment_is_booked
  - Namespace: c0a5f8e8_a30e_41fd_9474_beea4345e9b5
  - Parameters Count: 6
  - Parameters: [1] "Client Name", [2] "Date", [3] "Time", [4] "Therapist", [5] "Type", [6] "Duration"
  - From: 919655846492
  - To: 917996336719
  - Locale: en_US

[WhatsApp Template] Template API call completed. Full result: {
  "messageUUID": "abc123..."
}
[WhatsApp Template] ✅ Template message sent successfully via Vonage SDK
```

## Still Having Issues?

If you still get error 1022 after these changes:

1. **Double-check namespace**: Copy-paste directly from WhatsApp Manager to avoid typos
2. **Verify template approval**: Ensure template shows "Approved" (green checkmark)
3. **Check parameter count**: Count placeholders in your template and set `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS` accordingly
4. **Review Vonage logs**: Check Vonage Dashboard → Messages for detailed error information
5. **Test with simple template**: Create a minimal template with 1-2 parameters to isolate the issue

## Need Help?

Check the detailed guide: `backend/WHATSAPP_SETUP_GUIDE.md`

Or contact support with:
- Your template namespace
- Your template language
- Number of parameters in your template
- Full error message from Vonage Dashboard

