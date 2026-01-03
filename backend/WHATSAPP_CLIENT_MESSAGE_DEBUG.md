# WhatsApp Client Message Debugging Guide

## Current Issue

**Symptoms:**
1. Templates are NOT being used (messages show as "Text message" in Vonage Dashboard)
2. Client (`7996336719`) is NOT receiving messages
3. Therapist (`9742991324`) IS receiving messages (status: Read)

## Root Causes

### Issue 1: Templates Not Being Used

**Cause:** Missing environment variables for template configuration.

**Solution:** Add these environment variables to your production environment:

```env
# REQUIRED: Your WhatsApp Template Namespace
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5

# REQUIRED: Template Locale (MUST be en_US, not en)
WHATSAPP_TEMPLATE_LOCALE=en_US

# Already set (verify these match your WhatsApp Manager)
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_is_booked
WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED=theraptrack_appointment_cancelled
```

### Issue 2: Client Not Receiving Messages

**Possible Causes:**
1. Client phone number not being queued
2. Client phone number format issue
3. Client phone number not registered in WhatsApp Business
4. Messages being sent but rejected by WhatsApp

## Diagnostic Steps

### Step 1: Check Application Logs

After deploying the updated code, look for these specific log entries during booking:

#### A. Client Message Preparation
```
[WhatsApp] 📋 Preparing client notification for slot X:
  - userId: 34
  - userName: Chayalakshmi K N
  - userContact: +917996336719  ← Should start with +91
  - partnerId: 54
  - partnerName: Sanjeeb K S
```

**What to check:**
- `userContact` should be in format `+917996336719` (with +91 prefix)
- If missing or wrong format, the issue is in the user data

#### B. Client Message Queueing
```
[WhatsApp] 📤 Calling sendAppointmentConfirmation for CLIENT:
  - toPhoneNumber: +917996336719
  - appointmentId: 127
  - userId: 34
```

**What to check:**
- This should appear BEFORE the therapist message
- Phone number should be correctly formatted

#### C. Client Message Queue Entry
```
[WhatsApp Service] 📝 Queueing client appointment confirmation:
  - originalPhone: +917996336719
  - formattedPhone: +917996336719
  - appointmentId: 127
  - userId: 34
  - templateConfigured: true  ← Should be true
  - templateName: theraptrack_appointment_is_booked
  - useTemplates: true  ← Should be true
```

**What to check:**
- `templateConfigured` and `useTemplates` should both be `true`
- If `false`, templates are not configured correctly

#### D. Queue Processing
```
[WhatsApp Queue] ➕ Added message to queue:
  - type: appointment_confirmation
  - toPhoneNumber: +917996336719
  - appointmentId: 127
  - userId: 34
  - queueLength: 1
```

**What to check:**
- Message should be added to queue with `type: appointment_confirmation`
- `queueLength` should increase

#### E. Message Sending
```
[WhatsApp Queue] 📨 Processing message:
  - type: appointment_confirmation
  - toPhoneNumber: +917996336719
  - appointmentId: 127
  - userId: 34
```

**What to check:**
- This confirms the message is being processed from the queue
- Should appear for BOTH client and therapist

#### F. Template Usage
```
[WhatsApp Service] 🎯 Attempting to send appointment confirmation via template: theraptrack_appointment_is_booked
[WhatsApp Service] Template configuration:
  - useTemplates: true
  - templateName: theraptrack_appointment_is_booked
  - templateNamespace: c0a5f8e8_a30e_41fd_9474_beea4345e9b5  ← Must be set
  - templateLocale: en_US  ← Must be en_US
  - enabled: true
```

**What to check:**
- `templateNamespace` should show your namespace, not "NOT SET"
- `templateLocale` should be `en_US`, not `en`

#### G. Template Sending
```
[WhatsApp Template] Sending template message:
  - Template Name (original): theraptrack_appointment_is_booked
  - Template Name (with namespace): c0a5f8e8_a30e_41fd_9474_beea4345e9b5:theraptrack_appointment_is_booked
  - Namespace: c0a5f8e8_a30e_41fd_9474_beea4345e9b5
  - Parameters Count: 6
  - From: 919655846492
  - To: 917996336719  ← Client number
  - Locale: en_US
```

**What to check:**
- `To:` should be client number `917996336719` (without +)
- `Locale:` should be `en_US`
- `Template Name (with namespace)` should include your namespace

### Step 2: Check Vonage Dashboard

Go to https://dashboard.nexmo.com/messages and look for messages:

#### For Client Messages:
- **To:** `917996336719`
- **Status:** Should be "Delivered" or "Read" (green), not "Rejected" (red)
- **Body:** Should show "Template" not "Text message"

If you see:
- **"Rejected" with error 1022:** Template configuration issue (namespace/locale mismatch)
- **No message at all:** Message not being queued or sent
- **"Text message" instead of "Template":** Templates not configured or falling back to text

### Step 3: Verify User Data

Check the user's phone number in the database:

```sql
SELECT id, name, contact, email 
FROM users 
WHERE id = 34;  -- Replace with actual user ID
```

**Expected result:**
- `contact` should be `+917996336719` or `7996336719`
- If it's missing or in wrong format, update it:

```sql
UPDATE users 
SET contact = '+917996336719' 
WHERE id = 34;
```

### Step 4: Test Phone Number Formatting

The system should automatically format Indian numbers:
- Input: `7996336719` (10 digits) → Output: `+917996336719`
- Input: `917996336719` (11+ digits) → Output: `+917996336719`
- Input: `+917996336719` (already formatted) → Output: `+917996336719`

If formatting fails, you'll see:
```
[WhatsApp Service] ❌ Client phone number validation failed:
  - original: 7996336719
  - error: Invalid phone number format
```

## Quick Fixes

### Fix 1: Add Environment Variables

**On Render.com:**
1. Go to your service dashboard
2. Click "Environment" tab
3. Add these variables:
   ```
   WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5
   WHATSAPP_TEMPLATE_LOCALE=en_US
   ```
4. Click "Save Changes"
5. Service will automatically restart

### Fix 2: Verify User Phone Number

1. Log in to your database
2. Check user's contact:
   ```sql
   SELECT id, name, contact FROM users WHERE id = 34;
   ```
3. If contact is missing or wrong, update it:
   ```sql
   UPDATE users SET contact = '+917996336719' WHERE id = 34;
   ```

### Fix 3: Check WhatsApp Business Registration

The client's WhatsApp number must be registered to receive template messages:

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp Manager** > **Phone Numbers**
3. Verify `+917996336719` is registered
4. If not, you'll need to register it or use a different number for testing

## Expected Logs After Fix

After adding environment variables and restarting, you should see:

```
[WhatsApp Service] Initializing...
[WhatsApp Service] Template Configuration:
  - Namespace: c0a5f8e8_a30e_41fd_9474_beea4345e9b5  ✅
  - Locale: en_US  ✅

[WhatsApp] 📋 Preparing client notification for slot 80:
  - userContact: +917996336719  ✅

[WhatsApp Service] 📝 Queueing client appointment confirmation:
  - formattedPhone: +917996336719  ✅
  - templateConfigured: true  ✅
  - useTemplates: true  ✅

[WhatsApp Template] Sending template message:
  - Template Name (with namespace): c0a5f8e8_a30e_41fd_9474_beea4345e9b5:theraptrack_appointment_is_booked  ✅
  - To: 917996336719  ✅
  - Locale: en_US  ✅

[WhatsApp Template] ✅ Template message sent successfully via Vonage SDK
[WhatsApp Service] ✅ Message sent successfully: abc123... (Template)  ✅
```

## Common Mistakes

### ❌ Mistake 1: Using `en` instead of `en_US`
```env
WHATSAPP_TEMPLATE_LOCALE=en  # Wrong!
```
**Fix:**
```env
WHATSAPP_TEMPLATE_LOCALE=en_US  # Correct!
```

### ❌ Mistake 2: Missing Namespace
```env
# WHATSAPP_TEMPLATE_NAMESPACE not set
```
**Fix:**
```env
WHATSAPP_TEMPLATE_NAMESPACE=c0a5f8e8_a30e_41fd_9474_beea4345e9b5
```

### ❌ Mistake 3: Wrong Phone Number Format
```
userContact: 7996336719  # Missing country code
```
**Fix:**
```
userContact: +917996336719  # With country code
```

### ❌ Mistake 4: Not Restarting After Environment Variable Changes
After adding environment variables, you MUST restart the application.

## Still Not Working?

If client messages still aren't being sent after following all steps:

1. **Share the complete logs** from a booking attempt, including:
   - All `[WhatsApp]` log entries
   - All `[WhatsApp Service]` log entries
   - All `[WhatsApp Queue]` log entries
   - All `[WhatsApp Template]` log entries

2. **Share Vonage Dashboard info:**
   - Message IDs for both client and therapist
   - Status of each message
   - Any error messages

3. **Share user data:**
   ```sql
   SELECT id, name, contact FROM users WHERE id = YOUR_USER_ID;
   ```

4. **Check environment variables:**
   ```bash
   # On your server, check if variables are set
   echo $WHATSAPP_TEMPLATE_NAMESPACE
   echo $WHATSAPP_TEMPLATE_LOCALE
   ```

## Contact Support

When contacting support, provide:
1. Complete logs from a booking attempt
2. Vonage Dashboard message IDs and statuses
3. User's phone number format from database
4. Screenshot of environment variables (mask sensitive data)

