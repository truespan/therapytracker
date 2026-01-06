# Phone Login Debug Guide

## Issue
Partner with email `chayasks@gmail.com` cannot login using phone number `7996336719` (without country code), but can login with `+917996336719` (with country code).

## Changes Made

### 1. Improved Auth Model Query
**File:** `backend/src/models/Auth.js`

- Simplified and improved the SQL query for phone number lookup
- Changed from complex CASE statement to explicit OR conditions
- Added detailed logging for debugging

### 2. Added Login Logging
**File:** `backend/src/controllers/authController.js`

- Added console logs to track login attempts
- Logs show what identifier is being searched and what is found

### 3. Created Test Script
**File:** `backend/test_phone_login.js`

A diagnostic script to check:
- If the partner record exists
- What contact number is stored in the database
- If auth credentials are properly linked
- If phone number searches work correctly

## How to Debug

### Step 1: Run the Test Script

```bash
cd backend
node test_phone_login.js
```

This will show:
- ✅ What contact number is stored in the database
- ✅ If the auth credentials exist
- ✅ If phone searches are working
- ✅ Which format matches (with or without country code)

### Step 2: Check Backend Logs

When you try to login, check the backend console for logs like:

```
[LOGIN] Attempting login with identifier: 7996336719
[AUTH] Searching for phone - Original: 7996336719, Normalized: +917996336719
[AUTH] Found user by phone - Type: partner, ID: 123
[LOGIN] Found auth record - Type: partner, ID: 123
```

Or if it fails:

```
[LOGIN] Attempting login with identifier: 7996336719
[AUTH] Searching for phone - Original: 7996336719, Normalized: +917996336719
[AUTH] No user found with phone: 7996336719 or +917996336719
[LOGIN] No auth record found for: 7996336719
```

### Step 3: Verify Database

Run this SQL query to check the exact contact format:

```sql
SELECT p.id, p.name, p.email, p.contact, ac.id as auth_id
FROM partners p
JOIN auth_credentials ac ON ac.reference_id = p.id AND ac.user_type = 'partner'
WHERE p.email = 'chayasks@gmail.com';
```

Expected output should show the contact number format.

## Possible Issues and Solutions

### Issue 1: Contact stored without country code

If the database shows: `contact: 7996336719` (without +91)

**Solution:** The query should already handle this, but you can manually update:

```sql
UPDATE partners 
SET contact = '+917996336719' 
WHERE email = 'chayasks@gmail.com' AND contact = '7996336719';
```

### Issue 2: Contact has extra spaces or characters

If the database shows: `contact: +91 7996336719` or `contact: +91-7996336719`

**Solution:** Clean the contact number:

```sql
UPDATE partners 
SET contact = REPLACE(REPLACE(contact, ' ', ''), '-', '')
WHERE email = 'chayasks@gmail.com';
```

### Issue 3: Auth credentials not linked properly

If auth_credentials.reference_id doesn't match partners.id

**Solution:** Check and fix the reference:

```sql
-- Check the link
SELECT p.id as partner_id, p.email, ac.reference_id as auth_ref_id
FROM partners p
LEFT JOIN auth_credentials ac ON ac.email = p.email
WHERE p.email = 'chayasks@gmail.com';

-- If they don't match, update
UPDATE auth_credentials
SET reference_id = (SELECT id FROM partners WHERE email = 'chayasks@gmail.com')
WHERE email = 'chayasks@gmail.com' AND user_type = 'partner';
```

## Testing After Fix

1. **Restart the backend server** to load the updated code:
   ```bash
   cd backend
   npm start
   ```

2. **Try logging in with different formats**:
   - Email: `chayasks@gmail.com` ✅ Should work
   - Phone with country code: `+917996336719` ✅ Should work
   - Phone without country code: `7996336719` ✅ Should work now

3. **Check the logs** in the backend console to see what's happening

## Expected Behavior

After the fix:
- ✅ Login with email works
- ✅ Login with `+917996336719` works
- ✅ Login with `7996336719` works (auto-converts to +917996336719)

## Code Changes Summary

### Before
```javascript
// Complex CASE statement that might not match correctly
const phoneQuery = `
  SELECT ac.* FROM auth_credentials ac
  WHERE ac.reference_id IN (...)
  AND ac.user_type = CASE WHEN ... THEN 'partner' END
`;
```

### After
```javascript
// Explicit OR conditions for each user type
const phoneQuery = `
  SELECT DISTINCT ac.* FROM auth_credentials ac
  WHERE (
    (ac.user_type = 'partner' AND ac.reference_id IN (
      SELECT id FROM partners WHERE contact = $1 OR contact = $2
    ))
    OR ...
  )
`;
```

## Next Steps

1. Run the test script: `node backend/test_phone_login.js`
2. Check what it outputs
3. If the contact is stored correctly but still not working, check backend logs
4. Share the test script output and backend logs for further debugging

## Contact Format Standards

Going forward, ensure all phone numbers are stored as:
- Format: `+[country code][number]`
- Example: `+917996336719`
- No spaces, no dashes, no special characters
- Always include the `+` prefix

























































