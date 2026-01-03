# WhatsApp Template Rejected - Troubleshooting Guide

## Current Situation

Your logs show:
- ✅ Template message sent successfully to Vonage API
- ✅ Message ID returned: `1e9151f7-ca57-4989-a5bc-9ac90cc96545`
- ✅ Template name sent correctly: `theraptrack_appointment_is_booked`
- ✅ Locale sent correctly: `en_US`
- ✅ 6 parameters sent correctly
- ❌ **But WhatsApp rejected the message** (Status: Rejected in Vonage Dashboard)

This means **Vonage accepted the message**, but **WhatsApp rejected it**. The issue is with your WhatsApp Business Account configuration, not the code.

## Root Causes

### 1. Template Name Mismatch (Most Common)

Your template in WhatsApp Manager might be named differently than what you're sending.

**Check:**
1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp Manager** > **Message Templates**
3. Find your appointment booking template
4. Copy the **exact name** (case-sensitive, including underscores/dashes)

**Common mistakes:**
- You're sending: `theraptrack_appointment_is_booked`
- But template is named: `theraptrack-appointment-is-booked` (dashes instead of underscores)
- Or: `TherapTrack_Appointment_Is_Booked` (different capitalization)
- Or: `theraptrack_appointment_booked` (missing "is")

**Solution:**
Copy the exact name from WhatsApp Manager and update your environment variable:
```env
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=exact_name_from_whatsapp_manager
```

### 2. Template Language Mismatch

Your template might be approved for a different language variant.

**Check:**
1. In WhatsApp Manager, click on your template
2. Look for the **Language** field
3. It should say **"English (US)"** - not just "English"

**Common mistakes:**
- Template is approved for "English (UK)" → use `en_GB`
- Template is approved for "English" (generic) → might not work with `en_US`

**Solution:**
If template language is different, update your environment variable:
```env
# For English (UK)
WHATSAPP_TEMPLATE_LOCALE=en_GB

# For English (US) - default
WHATSAPP_TEMPLATE_LOCALE=en_US
```

### 3. Template Not Approved or Disabled

Template might show "Approved" but be inactive.

**Check:**
1. In WhatsApp Manager > Message Templates
2. Find your template
3. Check the **Status** column:
   - ✅ **Approved** (green) - Good
   - ⏳ **Pending** (yellow) - Wait for approval
   - ❌ **Rejected** (red) - Fix and resubmit
   - 🔒 **Disabled** - Enable it

**Solution:**
- If Pending: Wait for WhatsApp to approve (usually 1-2 hours)
- If Rejected: Check rejection reason, fix, and resubmit
- If Disabled: Click to enable it

### 4. Template Category Mismatch

WhatsApp has strict rules about template categories.

**Check:**
1. In WhatsApp Manager, check your template's **Category**
2. For appointment confirmations, use: **UTILITY**

**Categories:**
- **UTILITY** - For transactional messages (appointments, confirmations, etc.)
- **MARKETING** - For promotional messages (requires opt-in)
- **AUTHENTICATION** - For OTP/verification codes

**Solution:**
If category is wrong, you'll need to create a new template with the correct category.

### 5. WhatsApp Business Number Not Fully Verified

Your business number might not have full permissions.

**Check:**
1. Go to WhatsApp Manager > **Phone Numbers**
2. Find your number: `919655846492`
3. Check the **Status**:
   - ✅ **Connected** (green) - Good
   - ⚠️ **Pending Verification** - Complete verification
   - ❌ **Disconnected** - Reconnect

**Solution:**
- If pending: Complete the verification process
- If disconnected: Reconnect your number

### 6. Template Parameter Count Mismatch

Your template might have a different number of parameters.

**Check:**
1. In WhatsApp Manager, open your template
2. Count the placeholders: `{{1}}`, `{{2}}`, `{{3}}`, etc.
3. You're sending 6 parameters

**Solution:**
- If template has 7 parameters: `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=true`
- If template has 6 parameters: `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false` (default)

### 7. Template Content Policy Violation

WhatsApp might have flagged your template content.

**Check:**
1. In WhatsApp Manager, check if there's a warning on your template
2. Common violations:
   - URLs or links (not allowed in templates)
   - Promotional language in UTILITY templates
   - Misleading content

**Solution:**
Edit your template to comply with WhatsApp's policies and resubmit for approval.

## Diagnostic Steps

### Step 1: Get Exact Template Name

Run this command on your server:

```bash
cd backend
node test_template_name.js
```

This will show your current configuration and what to check.

### Step 2: Verify Template in WhatsApp Manager

1. Go to https://business.facebook.com/
2. Navigate to **WhatsApp Manager** > **Message Templates**
3. Find your appointment booking template
4. Screenshot the template details page
5. Verify:
   - ✅ Name matches exactly
   - ✅ Language is "English (US)"
   - ✅ Status is "Approved"
   - ✅ Category is "UTILITY"
   - ✅ Has 6 parameters

### Step 3: Check Vonage Dashboard for Error Details

1. Go to https://dashboard.nexmo.com/messages
2. Find message ID: `1e9151f7-ca57-4989-a5bc-9ac90cc96545`
3. Click on it to see detailed error
4. Look for specific error message from WhatsApp

**Common error messages:**
- "Template name not found" → Name mismatch
- "Template language not found" → Language mismatch
- "Template not approved" → Approval issue
- "Invalid parameters" → Parameter count mismatch

### Step 4: Test with a Simple Template

Create a minimal test template to isolate the issue:

**Template Name:** `test_simple`
**Category:** UTILITY
**Language:** English (US)
**Content:**
```
Hello {{1}}, your appointment is on {{2}}.
```

Then test with:
```env
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=test_simple
```

If this works, the issue is with your original template configuration.

## Quick Fixes

### Fix 1: Update Template Name

If the template name is different:

```env
# Check exact name in WhatsApp Manager, then update:
WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=actual_template_name_from_whatsapp_manager
```

### Fix 2: Update Template Language

If the template language is different:

```env
# For English (UK)
WHATSAPP_TEMPLATE_LOCALE=en_GB

# For Hindi
WHATSAPP_TEMPLATE_LOCALE=hi

# For Spanish
WHATSAPP_TEMPLATE_LOCALE=es
```

### Fix 3: Create New Template

If all else fails, create a new template:

1. Go to WhatsApp Manager > Message Templates
2. Click **Create Template**
3. Use these settings:
   - **Name:** `theraptrack_appointment_confirmed` (new name)
   - **Category:** UTILITY
   - **Language:** English (US)
   - **Content:**
     ```
     🎉 Appointment Confirmed!
     
     Hi {{1}},
     
     Your therapy session has been booked:
     
     📅 Date: {{2}}
     🕐 Time: {{3}}
     👨‍⚕️ Therapist: {{4}}
     🏥 Type: {{5}}
     ⏱️ Duration: {{6}}
     
     See you then!
     ```
4. Submit for approval
5. Once approved, update environment variable:
   ```env
   WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED=theraptrack_appointment_confirmed
   ```

## Why Therapist Gets Text Message

Your logs show:
```
[WhatsApp Queue] ✅ Message sent successfully: {
  type: 'therapist_notification',
  messageId: 'eba9e36a-244a-42ac-a18a-526ae9db402c',
  toPhoneNumber: '+919742991324',
  usedTemplate: false  ← Text message, not template
}
```

**Reason:** The code currently only uses templates for **client messages**, not therapist messages. Therapist notifications are sent as plain text.

**To fix:** You need to create a separate template for therapist notifications and update the code to use it.

## Expected Results After Fix

Once you fix the template configuration:

### ✅ Client Messages:
- **Vonage Status:** Delivered (green)
- **Message Type:** Template
- **Client receives:** Formatted template message

### ✅ Therapist Messages:
- **Vonage Status:** Read (green)
- **Message Type:** Text (until you add therapist template)
- **Therapist receives:** Plain text message

## Still Not Working?

If you've checked everything and it's still not working:

1. **Share the exact template name** from WhatsApp Manager (screenshot)
2. **Share the template language** from WhatsApp Manager
3. **Share the template status** (Approved/Pending/Rejected)
4. **Share the error message** from Vonage Dashboard for message ID `1e9151f7-ca57-4989-a5bc-9ac90cc96545`
5. **Share your WhatsApp Business Account status** (verified/pending)

## Contact WhatsApp Support

If the template appears correct but still doesn't work:

1. Go to [WhatsApp Business Support](https://business.facebook.com/business/help)
2. Report the issue with:
   - Your WhatsApp Business Account ID
   - Template name: `theraptrack_appointment_is_booked`
   - Message ID: `1e9151f7-ca57-4989-a5bc-9ac90cc96545`
   - Error: "Template message rejected by WhatsApp"

They can check their internal logs to see why the template is being rejected.

