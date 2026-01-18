# Settlement Webhook Configuration Guide

## Overview

The settlement webhook automatically updates earnings from `pending` → `available` when Razorpay settles payments. A single settlement can contain multiple payments.

## ✅ What's Implemented

### 1. **Settlement Webhook Handler**
- Location: `backend/src/controllers/razorpayController.js:664-702`
- Handles `settlement.processed` event from Razorpay
- Automatically fetches all payments in the settlement
- Updates all matching earnings records to `available` status

### 2. **Settlement Payment Fetcher**
- Location: `backend/src/services/razorpayService.js:221-262`
- Uses Razorpay REST API endpoint: `/settlements/{id}/recon/combined`
- Extracts all payment IDs from a settlement
- Handles settlements with multiple payments

### 3. **Settlement Sync Service**
- Location: `backend/src/services/settlementSyncService.js:285-373`
- Processes settlements received via webhook
- Updates earnings for all payments in the settlement
- Logs detailed results for each recipient

## 🔧 Configuration Steps

### Step 1: Configure Razorpay Webhook

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) → Settings → Webhooks

2. Click **"+ New Webhook"**

3. Enter webhook URL:
   ```
   https://your-backend-domain.com/api/razorpay/webhook
   ```

4. Select the following events:
   - ✅ `payment.captured` (already configured)
   - ✅ `payment.authorized` (already configured)
   - ✅ `settlement.processed` (NEW - add this!)

5. Set webhook secret (copy this):
   ```
   [Your webhook secret will be shown here]
   ```

6. Save the webhook

### Step 2: Update Environment Variables

Add/update in your `.env` file:

```env
# Razorpay Credentials
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here

# Webhook Secret (from Step 1, #5)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Verify Configuration

Run this command to verify the webhook is working:

```bash
# Check if axios is installed (required for REST API calls)
npm list axios

# If not installed, install it
npm install axios
```

## 🔄 How It Works

### Flow Diagram

```
Payment Captured (Day 0)
    ↓
Earnings created with status='pending'
    ↓
    ... wait T+3 business days ...
    ↓
Razorpay settles payment
    ↓
settlement.processed webhook fires
    ↓
Backend fetches all payments in settlement
    ↓
Updates earnings: pending → available
    ↓
Therapist sees amount in Available Balance
```

### Example Webhook Payload

When Razorpay settles payments, it sends:

```json
{
  "event": "settlement.processed",
  "payload": {
    "settlement": {
      "entity": {
        "id": "setl_S4sBcxZ9wOEPYB",
        "amount": 80944,
        "status": "processed",
        "fees": 1888,
        "tax": 288,
        "created_at": 1768704214
      }
    }
  }
}
```

### Backend Processing

1. **Receives Webhook**
   - `razorpayController.handleWebhook()` validates signature
   - Routes to `handleSettlementProcessed()`

2. **Fetches Settlement Payments**
   - Calls `RazorpayService.fetchSettlementPayments(settlementId)`
   - Makes REST API call to: `GET /settlements/{id}/recon/combined`
   - Returns array of payment IDs: `['pay_S4EzoUPiSEFf6Z', 'pay_S4Zvccfa0NuG0v', ...]`

3. **Updates Earnings**
   - Calls `Earnings.updateMultipleByPaymentIds(paymentIds, 'available', payoutDate, settlementId)`
   - Only updates earnings with `status='pending'` (safety check)
   - Sets `payout_date` to next Saturday
   - Records `razorpay_settlement_id` for tracking

4. **Logs Results**
   - Shows which recipients were updated
   - Displays new available balances
   - Reports any errors

## 🧪 Testing the Webhook

### Option 1: Wait for Real Settlement (T+3 days)
Make a test payment and wait 3 business days for Razorpay to settle it naturally.

### Option 2: Manually Trigger via Script

Use the manual settlement update script:

```bash
node backend/scripts/manual-settlement-update.js
```

Edit the script to add payment → settlement mappings you see in Razorpay dashboard.

### Option 3: Test with Razorpay Webhook Simulator

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click on your webhook
3. Scroll to "Test Webhook"
4. Select event: `settlement.processed`
5. Edit payload with a real settlement ID from your dashboard
6. Click "Send Test Webhook"

### Verify It Worked

Check the logs for:

```bash
[WEBHOOK] Received event: settlement.processed (ID: evt_xxx)
[SETTLEMENT_SYNC] Processing settlement setl_xxx...
[SETTLEMENT_SYNC] Settlement contains 2 payment IDs
[SETTLEMENT_SYNC] ✅ Successfully updated 2 earnings from settlement setl_xxx
[SETTLEMENT_SYNC] Updated available balance for partner#80:
  available_balance: 1600.00
  pending_earnings: 0.00
  newly_available: 1600.00
```

Check the database:

```sql
SELECT
  id,
  razorpay_payment_id,
  razorpay_settlement_id,
  amount,
  status,
  payout_date,
  recipient_id,
  recipient_type
FROM earnings
WHERE razorpay_settlement_id = 'setl_S4sBcxZ9wOEPYB';
```

Expected result:
- `status` = `'available'`
- `razorpay_settlement_id` = `'setl_S4sBcxZ9wOEPYB'`
- `payout_date` = next Saturday's date

## 📊 Monitoring

### Check Webhook Logs

```bash
# View recent webhook events
SELECT event_type, entity_type, entity_id, created_at
FROM razorpay_webhooks
WHERE event_type = 'settlement.processed'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Earnings Status

```bash
# View earnings that have been settled
SELECT
  recipient_type,
  recipient_id,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  razorpay_settlement_id
FROM earnings
WHERE status = 'available'
  AND razorpay_settlement_id IS NOT NULL
GROUP BY recipient_type, recipient_id, razorpay_settlement_id
ORDER BY MAX(updated_at) DESC;
```

## 🚨 Troubleshooting

### Webhook Not Receiving Events

1. **Check Razorpay Dashboard → Webhooks → Event Logs**
   - See if events are being sent
   - Check for delivery failures

2. **Verify webhook URL is accessible**
   ```bash
   curl -X POST https://your-backend.com/api/razorpay/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "ping"}'
   ```

3. **Check webhook secret is correct**
   - Environment variable `RAZORPAY_WEBHOOK_SECRET` must match Razorpay dashboard

### Settlement Processed But Earnings Not Updated

1. **Check backend logs** for errors during webhook processing

2. **Verify payment IDs exist in earnings table**
   ```sql
   SELECT * FROM earnings
   WHERE razorpay_payment_id IN ('pay_S4EzoUPiSEFf6Z', 'pay_S4Zvccfa0NuG0v');
   ```

3. **Check if earnings are already in 'available' or 'withdrawn' status**
   - The update only works for `status='pending'`

4. **Manually run the settlement sync**
   ```bash
   node backend/scripts/manual-settlement-update.js
   ```

### "Failed to fetch settlement payments" Error

This means the REST API call to Razorpay failed. Check:

1. **Razorpay credentials are correct**
   ```bash
   echo $RAZORPAY_KEY_ID
   echo $RAZORPAY_KEY_SECRET
   ```

2. **Settlement ID is valid**
   - Copy from Razorpay dashboard
   - Should start with `setl_`

3. **API rate limits**
   - Razorpay limits API calls
   - Wait and retry

## 📝 Summary

| Feature | Status | Details |
|---------|--------|---------|
| Webhook Handler | ✅ Implemented | Handles `settlement.processed` event |
| Multiple Payments | ✅ Supported | Single settlement → multiple payment IDs |
| REST API Integration | ✅ Complete | Fetches payments via `/settlements/{id}/recon/combined` |
| Earnings Update | ✅ Automated | Updates `pending` → `available` |
| Settlement Tracking | ✅ Enabled | Stores `razorpay_settlement_id` |
| Payout Scheduling | ✅ Implemented | Sets `payout_date` to next Saturday |
| Error Handling | ✅ Robust | Logs errors, doesn't fail webhook |

## 🔗 Related Files

- Webhook handler: `backend/src/controllers/razorpayController.js`
- Settlement service: `backend/src/services/settlementSyncService.js`
- Razorpay service: `backend/src/services/razorpayService.js`
- Earnings model: `backend/src/models/Earnings.js`
- Webhook routes: `backend/src/routes/razorpayRoutes.js`
- Manual fix script: `backend/scripts/manual-settlement-update.js`
