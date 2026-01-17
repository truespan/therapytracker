# Settlement Synchronization Guide

## Overview

This guide explains how settlements are captured from Razorpay and how the "Available Balance" is updated for therapists (partners) and organizations.

## Problem Statement

Previously, settlements were not being captured properly, causing the "Available Balance" to not reflect the actual settled amounts. This happened because:

1. Payment IDs from settlements were not being extracted correctly
2. The earnings status was not being updated from 'pending' to 'available'
3. There was insufficient logging to diagnose settlement issues

## Solution

The settlement synchronization system now properly:

1. **Extracts payment IDs** from Razorpay settlement webhooks
2. **Updates earnings status** from 'pending' to 'available' when settlements are processed
3. **Calculates available balance** correctly based on settled payments
4. **Provides diagnostic tools** to identify and fix synchronization issues

---

## How Settlement Sync Works

### 1. Automatic Webhook Processing

When Razorpay processes a settlement, it sends a `settlement.processed` webhook to your server.

**Flow:**
```
Razorpay Settlement → Webhook → handleSettlementProcessed() → SettlementSyncService.processSettlement() → Update Earnings
```

**Implementation:**
- Webhook handler: [`backend/src/controllers/razorpayController.js`](backend/src/controllers/razorpayController.js:650)
- Centralized logic: [`backend/src/services/settlementSyncService.js`](backend/src/services/settlementSyncService.js:1)

```javascript
async function handleSettlementProcessed(event) {
  // Extract settlement ID from webhook
  const settlementId = event.payload.settlement.entity.id;

  // Delegate processing to the centralized service
  await SettlementSyncService.processSettlement(settlementId);
}
```

**Key Features:**
- ✅ Filters payment IDs (only those starting with `pay_`)
- ✅ Handles multiple payments in a single settlement
- ✅ Updates `razorpay_settlement_id` in earnings table
- ✅ Logs available balance updates for each affected therapist
- ✅ Centralized logic shared by webhook + cron + manual endpoints

---

### 2. Manual Settlement Sync (For Therapists)

Therapists can manually trigger a settlement sync if webhooks are delayed or missed.

**Endpoint:** `POST /api/earnings/sync-settlement`

**Authentication:** Required (Partner or Organization token)

**Implementation:** [`backend/src/controllers/earningsController.js`](backend/src/controllers/earningsController.js:99)

**How it works:**
Uses the same centralized service logic as cron/webhooks:
- [`SettlementSyncService.syncRecipientSettlements()`](backend/src/services/settlementSyncService.js:177)

**Example Request:**
```bash
curl -X POST https://your-api.com/api/earnings/sync-settlement \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Settlement sync completed. 5 earnings updated to 'available'",
  "synced": 5,
  "skipped": 2,
  "errors": 0
}
```

---

### 3. Admin Global Settlement Sync

Admins can sync settlements for all partners and organizations at once.

**Endpoint:** `POST /api/admin/earnings/sync-all-settlements`

**Authentication:** Required (Admin role)

**Implementation:** [`backend/src/controllers/earningsController.js`](backend/src/controllers/earningsController.js:130)

**How it works:**
Uses the same centralized service logic as cron/webhooks:
- [`SettlementSyncService.syncAllSettlements()`](backend/src/services/settlementSyncService.js:22)

**Example Response:**
```json
{
  "success": true,
  "message": "Global settlement sync completed. 15 earnings updated across 3 recipients",
  "total_synced": 15,
  "total_skipped": 5,
  "total_errors": 0,
  "recipients_processed": 3,
  "recipients": [
    {
      "recipient_id": 1,
      "recipient_type": "partner",
      "synced": 5,
      "skipped": 2,
      "errors": 0,
      "pending_count": 7
    }
  ]
}
```

---

### 4. Scheduled (Cron) Settlement Sync — Safety Net

Even with webhooks enabled, operational issues can cause missed/delayed events (downtime, transient DB errors, webhook retries exhausted). To ensure **eventual consistency**, the backend also runs a cron job that periodically re-syncs settlements.

**Schedule:** Every 6 hours (IST) at 00:00, 06:00, 12:00, 18:00.

**Implementation:**
- Cron job: [`backend/src/jobs/settlementSyncCron.js`](backend/src/jobs/settlementSyncCron.js:1)
- Startup hook: [`backend/src/server.js`](backend/src/server.js:71)

This cron job calls:
- [`SettlementSyncService.syncAllSettlements()`](backend/src/services/settlementSyncService.js:22)

---

## Available Balance Calculation

The "Available Balance" is calculated in the [`Earnings.getEarningsSummary()`](backend/src/models/Earnings.js:51) method:

```sql
SELECT 
  COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
  COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
  COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings,
  COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings
FROM earnings
WHERE recipient_id = $1 AND recipient_type = $2
```

**Earnings Status Flow:**
```
pending → available → withdrawn
   ↓          ↓           ↓
Payment    Settlement   Payout
Captured   Processed   Completed
```

---

## Diagnostic Tools

### 1. Check Settlement Sync Status

**Script:** [`backend/scripts/check-settlement-sync.js`](backend/scripts/check-settlement-sync.js)

**Usage:**
```bash
# Check all recipients
node backend/scripts/check-settlement-sync.js

# Check specific recipient
node backend/scripts/check-settlement-sync.js 123
```

**What it checks:**
- ✅ Pending earnings that haven't been settled
- ✅ Recent settlements from Razorpay
- ✅ Cross-checks pending earnings with settlements
- ✅ Shows available balances for all recipients
- ✅ Identifies earnings that need sync

**Example Output:**
```
================================================================================
SETTLEMENT SYNCHRONIZATION DIAGNOSTIC
================================================================================

📊 PENDING EARNINGS: 5 records
--------------------------------------------------------------------------------
⚠️  Found pending earnings that may need settlement sync:

   partner#123: 5 pending earnings, Total: ₹2500.00
      - Payment ID: pay_abc123 | Amount: ₹500.00 | Created: 2026-01-15
      - Payment ID: pay_def456 | Amount: ₹500.00 | Created: 2026-01-16
      ... and 3 more

================================================================================
🔍 CHECKING RAZORPAY SETTLEMENTS
--------------------------------------------------------------------------------
Found 10 recent settlements from Razorpay

Recent settlements:
   1. setl_xyz789 | Amount: ₹2500.00 | Payments: 5 | Date: 2026-01-17 | Status: processed

Total payment IDs in settlements: 5

================================================================================
🔄 CROSS-CHECKING PENDING EARNINGS WITH SETTLEMENTS
--------------------------------------------------------------------------------
✅ Found in settlements: 5 earnings
⏳ Not yet settled: 0 earnings

⚠️  EARNINGS THAT NEED SYNC (found in settlements but still marked as pending):
   1. Earning #101 | Payment: pay_abc123 | Settlement: setl_xyz789
      Amount: ₹500.00 | Recipient: partner#123

💡 RECOMMENDATION:
   Run the settlement sync to update these earnings:
   - For specific recipient: POST /api/earnings/sync-settlement (with auth token)
   - For all recipients (admin): POST /api/admin/earnings/sync-all-settlements
   - Or run: node backend/scripts/sync-all-settlements.js
```

### 2. Sync All Settlements Script

**Script:** [`backend/scripts/sync-all-settlements.js`](backend/scripts/sync-all-settlements.js)

**Usage:**
```bash
node backend/scripts/sync-all-settlements.js
```

This script automatically syncs all pending earnings with Razorpay settlements.

---

## Troubleshooting

### Issue: Available Balance is not updating

**Possible Causes:**
1. Webhooks are not being received
2. Settlement webhook is not enabled in Razorpay
3. Payment IDs are not being extracted correctly
4. Earnings records don't have payment IDs

**Solution:**
1. Check webhook configuration in Razorpay Dashboard
2. Ensure `settlement.processed` event is enabled
3. Run diagnostic script: `node backend/scripts/check-settlement-sync.js`
4. Manually trigger sync: `POST /api/earnings/sync-settlement`

### Issue: Pending earnings not found in settlements

**Possible Causes:**
1. Razorpay hasn't processed the settlement yet (usually takes 2-3 business days)
2. Payment is still in captured state, not settled
3. Payment failed or was refunded

**Solution:**
1. Wait for Razorpay's settlement cycle (typically T+2 or T+3 days)
2. Check payment status in Razorpay Dashboard
3. Run diagnostic script to see which payments are pending

### Issue: Webhook not being received

**Possible Causes:**
1. Webhook URL is incorrect
2. Server is not accessible from Razorpay
3. SSL certificate issues
4. Webhook signature verification failing

**Solution:**
1. Verify webhook URL in Razorpay Dashboard
2. Check server logs for webhook requests
3. Test webhook manually using Razorpay Dashboard
4. Ensure webhook secret is correctly configured

---

## Database Schema

### Earnings Table

```sql
CREATE TABLE earnings (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('partner', 'organization')),
    razorpay_payment_id VARCHAR(255) REFERENCES razorpay_payments(razorpay_payment_id),
    razorpay_settlement_id VARCHAR(255),  -- Added for settlement tracking
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'available', 'held', 'withdrawn', 'cancelled')),
    session_id INTEGER REFERENCES therapy_sessions(id),
    appointment_id INTEGER REFERENCES appointments(id),
    payout_date DATE,
    payout_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_earnings_recipient ON earnings(recipient_id, recipient_type);
CREATE INDEX idx_earnings_status ON earnings(status);
CREATE INDEX idx_earnings_payment_id ON earnings(razorpay_payment_id);
CREATE INDEX idx_earnings_settlement_id ON earnings(razorpay_settlement_id);
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/earnings` | GET | Partner/Org | Get earnings summary |
| `/api/earnings/sync-settlement` | POST | Partner/Org | Manual settlement sync |
| `/api/admin/earnings/sync-all-settlements` | POST | Admin | Global settlement sync |

---

## Logging

All settlement operations are logged with the `[EARNINGS]` prefix:

```
[EARNINGS] Processing settlement event: { settlement_id: 'setl_xyz789', ... }
[EARNINGS] Fetching settlement details from Razorpay for setl_xyz789...
[EARNINGS] Settlement setl_xyz789 contains 5 payment IDs: ['pay_abc123', ...]
[EARNINGS] Updating earnings for 5 payments to 'available' status...
[EARNINGS] ✅ Successfully updated 5 earnings to 'available' from settlement setl_xyz789
[EARNINGS] Updated available balance for partner#123: { available_balance: 2500.00, ... }
```

---

## Best Practices

1. **Enable Webhooks**: Always enable `settlement.processed` webhook in Razorpay Dashboard
2. **Monitor Logs**: Regularly check logs for `[EARNINGS]` entries to ensure settlements are being processed
3. **Run Diagnostics**: Use the diagnostic script weekly to identify any sync issues
4. **Manual Sync**: If webhooks are delayed, use the manual sync endpoint
5. **Test Mode**: Test settlement flow in Razorpay test mode before going live

---

## Related Files

- **Webhook Handler**: [`backend/src/controllers/razorpayController.js`](backend/src/controllers/razorpayController.js)
- **Earnings Controller**: [`backend/src/controllers/earningsController.js`](backend/src/controllers/earningsController.js)
- **Earnings Model**: [`backend/src/models/Earnings.js`](backend/src/models/Earnings.js)
- **Razorpay Service**: [`backend/src/services/razorpayService.js`](backend/src/services/razorpayService.js)
- **Diagnostic Script**: [`backend/scripts/check-settlement-sync.js`](backend/scripts/check-settlement-sync.js)
- **Sync Script**: [`backend/scripts/sync-all-settlements.js`](backend/scripts/sync-all-settlements.js)

---

## Support

For issues or questions:
1. Check the logs for `[EARNINGS]` entries
2. Run the diagnostic script
3. Review Razorpay Dashboard for settlement status
4. Contact support with diagnostic output
