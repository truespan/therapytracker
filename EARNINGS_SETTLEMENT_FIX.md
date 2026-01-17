# Earnings Settlement Fix - Implementation Summary

## Problem
Razorpay settled amounts were not appearing in the "Available Balance" section of the Earnings tab, even when payments were shown as settled by Razorpay.

## Root Cause
The `available_balance` calculation only includes earnings with status `'available'`. When Razorpay settles payments (typically T+2/T+3 days after payment capture), a webhook should update earnings status from `'pending'` to `'available'`. However, if webhooks are delayed, missed, or not processed correctly, earnings remain in `'pending'` status and don't appear in Available Balance.

## Solution Implemented

### 1. Enhanced Logging ✅
**File:** `backend/src/controllers/razorpayController.js`

- Added detailed logging to webhook endpoint to track all settlement events
- Enhanced `handlePaymentSettled` function with comprehensive logging:
  - Logs when settlement events are received
  - Logs earnings record lookup results
  - Logs status update operations with before/after details
  - Logs errors with full context

**Benefits:**
- Easier debugging of webhook issues
- Track settlement event processing
- Identify missing or failed webhook deliveries

### 2. Diagnostic Script ✅
**File:** `backend/scripts/diagnose-earnings-settlement.js`

A comprehensive diagnostic tool that:
- Lists all pending earnings records (should have been settled)
- Shows available earnings records (already settled)
- Displays summary statistics by status
- Checks for recent settlement webhook events
- Can filter by partner or organization ID

**Usage:**
```bash
# Check all pending earnings
node backend/scripts/diagnose-earnings-settlement.js

# Check for specific partner
node backend/scripts/diagnose-earnings-settlement.js partner:123

# Check for specific organization
node backend/scripts/diagnose-earnings-settlement.js org:456
```

**Output includes:**
- Count and details of pending earnings
- Count and total of available earnings
- Age of pending payments (warns if >2 days old)
- Recent webhook events (last 7 days)
- Summary statistics by recipient

### 3. Manual Settlement Sync Endpoint ✅
**File:** `backend/src/controllers/earningsController.js`
**Route:** `POST /api/earnings/sync-settlement`

A new API endpoint that:
- Checks all pending earnings for the authenticated user (partner/organization)
- Queries Razorpay API to get current payment status
- Updates earnings status from `'pending'` to `'available'` if payment is settled
- Returns detailed sync results (synced, skipped, errors)

**Usage:**
```javascript
// From frontend or API client
POST /api/earnings/sync-settlement
Headers: {
  Authorization: Bearer <token>
}

// Response:
{
  success: true,
  message: "Settlement sync completed. 3 earnings updated to 'available'",
  synced: 3,
  skipped: 1,
  errors: 0
}
```

**When to use:**
- If webhooks are delayed
- If you notice pending earnings that should be available
- As a manual fix for missed webhook events
- Periodic reconciliation

### 4. Error Handling Improvements ✅
Enhanced error handling in `handlePaymentSettled`:
- Better error messages with context
- Logs full error details including stack traces
- Continues processing other payments even if one fails
- Non-blocking (doesn't fail webhook response)

## How the Settlement Flow Works

### Automatic Flow (via Webhook)
1. Payment captured → Earnings created with status `'pending'`
2. Razorpay settles payment (T+2/T+3 days) → Sends `payment.settled` or `payment.transferred` webhook
3. Webhook handler `handlePaymentSettled` processes event:
   - Finds earnings by payment ID
   - If status is `'pending'`, updates to `'available'`
   - Sets `payout_date` to next Saturday
4. Available Balance calculation now includes this earnings record

### Manual Flow (via Sync Endpoint)
1. Call `POST /api/earnings/sync-settlement`
2. System fetches all pending earnings for the user
3. For each pending earnings:
   - Queries Razorpay API for payment status
   - Checks if payment is settled (status = 'captured' + has transfers/settlement indicators)
   - Updates to `'available'` if settled
4. Returns sync results

## Testing

### Test Webhook Processing
1. Check server logs when settlement webhook is received
2. Look for `[EARNINGS]` and `[WEBHOOK]` log entries
3. Verify earnings status is updated in database

### Test Diagnostic Script
```bash
# Run diagnostic
node backend/scripts/diagnose-earnings-settlement.js

# Review output:
# - Check pending earnings count
# - Verify available earnings
# - Review webhook events
```

### Test Manual Sync
```bash
# Using curl
curl -X POST http://localhost:5000/api/earnings/sync-settlement \
  -H "Authorization: Bearer YOUR_TOKEN"

# Using Postman/Insomnia
POST /api/earnings/sync-settlement
Headers: Authorization: Bearer <token>
```

## Monitoring

### Key Log Messages to Watch
- `[WEBHOOK] Received event: payment.settled` - Settlement webhook received
- `[EARNINGS] ✅ Successfully updated` - Earnings status updated successfully
- `[EARNINGS] ⚠️ Earnings already has status` - Earnings already processed
- `[EARNINGS] ⚠️ No earnings record found` - Payment without earnings record

### Database Queries for Monitoring
```sql
-- Check pending earnings older than 3 days (should be settled)
SELECT id, razorpay_payment_id, amount, created_at, 
       EXTRACT(DAY FROM NOW() - created_at) as age_days
FROM earnings
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '3 days'
ORDER BY created_at DESC;

-- Check available balance
SELECT recipient_id, recipient_type, SUM(amount) as available_balance
FROM earnings
WHERE status = 'available'
GROUP BY recipient_id, recipient_type;

-- Check recent settlement webhooks
SELECT event_id, event_type, entity_id, created_at
FROM razorpay_webhooks
WHERE event_type IN ('payment.settled', 'payment.transferred')
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Next Steps

1. **Monitor Logs**: Check server logs for settlement webhook events and processing
2. **Run Diagnostic**: Use the diagnostic script to identify any stuck pending earnings
3. **Manual Sync**: Use the sync endpoint to update any pending earnings that should be available
4. **Verify Webhook Setup**: Ensure Razorpay webhooks are properly configured:
   - Webhook URL is accessible
   - Webhook secret is configured
   - `payment.settled` and `payment.transferred` events are enabled

## Files Modified

1. `backend/src/controllers/razorpayController.js` - Enhanced logging and error handling
2. `backend/src/controllers/earningsController.js` - Added manual sync endpoint
3. `backend/src/routes/index.js` - Added sync endpoint route
4. `backend/scripts/diagnose-earnings-settlement.js` - New diagnostic script

## Notes

- The settlement sync endpoint requires authentication (partner or organization)
- Webhook processing is non-blocking (errors don't fail the webhook response)
- Settlement detection checks multiple indicators (status, transfers, settlement flags)
- All date calculations use UTC and proper date utilities
