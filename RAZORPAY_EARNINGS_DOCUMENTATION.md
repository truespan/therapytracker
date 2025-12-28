# Razorpay Earnings Calculation Implementation

## Overview

This document describes the earnings calculation system integrated with Razorpay payment processing. The system tracks earnings for partners and organizations based on booking fee payments collected through Razorpay, following the payment settlement and disbursement flow.

## Architecture

### Payment Flow

```
User Books Appointment
    ↓
Razorpay Payment Captured
    ↓ (webhook: payment.captured)
Create Earnings Record (status: 'pending')
    ↓
Razorpay Settles Payment (T+2/T+3 days)
    ↓ (webhook: payment.transferred/settled)
Update Earnings Status → 'available'
    ↓
Saturday Payout Batch
    ↓
Transfer to Partner Bank
    ↓ (webhook: payout.processed)
Update Earnings Status → 'withdrawn'
```

## Earnings Status Lifecycle

Earnings records progress through the following statuses:

1. **`pending`** - Payment captured, waiting for Razorpay settlement (typically T+2 or T+3 days)
2. **`available`** - Payment settled, ready for withdrawal (money in merchant account)
3. **`withdrawn`** - Payment transferred to partner/organization bank account
4. **`cancelled`** - Payment failed or refunded (not included in calculations)

## Calculation Logic

### 1. Available Balance

**Definition:** Money that can be withdrawn now (settled payments not yet paid out)

**Calculation:**
```sql
SELECT COALESCE(SUM(amount), 0) 
FROM earnings 
WHERE recipient_id = $1 
  AND recipient_type = $2 
  AND status = 'available'
```

**Business Logic:**
- Sum of all earnings with `status = 'available'`
- These are payments that have been settled by Razorpay and are ready for the next Saturday payout batch
- Money is in the merchant account and can be transferred

### 2. Withdrawn Amount

**Definition:** Total money already paid out to partner/organization

**Calculation:**
```sql
SELECT COALESCE(SUM(amount), 0) 
FROM earnings 
WHERE recipient_id = $1 
  AND recipient_type = $2 
  AND status = 'withdrawn'
```

**Business Logic:**
- Sum of all earnings with `status = 'withdrawn'`
- These are payments that have been successfully transferred to the partner's/organization's bank account
- Represents historical payout total

### 3. Total Earnings

**Definition:** All-time total of settled payments (available + withdrawn)

**Calculation:**
```sql
SELECT COALESCE(SUM(amount), 0) 
FROM earnings 
WHERE recipient_id = $1 
  AND recipient_type = $2 
  AND status IN ('available', 'withdrawn')
```

**Business Logic:**
- Sum of all earnings with `status IN ('available', 'withdrawn')`
- Excludes `pending` (not yet settled) and `cancelled` payments
- Represents total lifetime earnings from settled payments

### 4. Upcoming Payout

**Definition:** Amount scheduled for next Saturday's payout batch

**Calculation:**
```sql
SELECT COALESCE(SUM(amount), 0) 
FROM earnings 
WHERE recipient_id = $1 
  AND recipient_type = $2 
  AND status = 'available'
```

**Business Logic:**
- Sum of all earnings with `status = 'available'`
- All available earnings are included in the next Saturday payout batch
- Same as Available Balance (all available funds are paid out weekly)

## Database Schema

### Earnings Table

```sql
CREATE TABLE earnings (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('partner', 'organization')),
    razorpay_payment_id VARCHAR(255) REFERENCES razorpay_payments(razorpay_payment_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'available', 'held', 'withdrawn', 'cancelled')),
    session_id INTEGER REFERENCES therapy_sessions(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    payout_date DATE,
    payout_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Fields

- **`recipient_id`**: Partner or Organization ID
- **`recipient_type`**: 'partner' or 'organization'
- **`razorpay_payment_id`**: Links to Razorpay payment record
- **`status`**: Current status in the earnings lifecycle
- **`payout_date`**: Scheduled Saturday date for payout (set when status becomes 'available')
- **`amount`**: Earnings amount (100% of booking fee goes to partner/org)

## Implementation Details

### 1. Earnings Record Creation

**Location:** `backend/src/controllers/razorpayController.js` - `verifyBookingPayment()`

**When:** After successful booking payment verification

**Process:**
1. Payment is verified via Razorpay signature
2. Payment record is saved to `razorpay_payments` table
3. Earnings record is created with:
   - `status = 'pending'` (waiting for settlement)
   - `recipient_id` = partner ID (from order metadata)
   - `recipient_type` = 'partner'
   - `razorpay_payment_id` = payment ID
   - `amount` = full booking fee (100% to partner)
   - `appointment_id` = appointment ID (if available from slot)

**Code Example:**
```javascript
await Earnings.create({
  recipient_id: partner.id,
  recipient_type: 'partner',
  razorpay_payment_id: payment.id,
  amount: dbPayment.amount,
  currency: dbPayment.currency,
  status: 'pending',
  appointment_id: appointmentId,
  payout_date: null
});
```

### 2. Payment Settlement Handler

**Location:** `backend/src/controllers/razorpayController.js` - `handlePaymentSettled()`

**Webhook Events:** `payment.transferred`, `payment.settled`

**Process:**
1. Webhook received from Razorpay when payment is settled
2. Find earnings record by `razorpay_payment_id`
3. If status is `'pending'`, update to `'available'`
4. Set `payout_date` to next Saturday using `getNextSaturday()` utility
5. Earnings are now ready for withdrawal

**Code Example:**
```javascript
const earnings = await Earnings.findByPaymentId(payment.id);
if (earnings && earnings.status === 'pending') {
  const nextSaturday = getNextSaturday();
  const payoutDate = formatDate(nextSaturday);
  await Earnings.updateStatusByPaymentId(payment.id, 'available', payoutDate);
}
```

### 3. Payout Processing Handler

**Location:** `backend/src/controllers/razorpayController.js` - `handlePayoutProcessed()`

**Webhook Events:** `payout.processed`, `payout.completed`

**Process:**
1. Webhook received from Razorpay when payout is processed
2. Extract payout date from webhook payload
3. Update all earnings with matching `payout_date` from `'available'` to `'withdrawn'`
4. Earnings are now marked as paid out

**Code Example:**
```javascript
const updateQuery = `
  UPDATE earnings
  SET status = 'withdrawn',
      updated_at = CURRENT_TIMESTAMP
  WHERE status = 'available'
    AND payout_date = $1
`;
await db.query(updateQuery, [payoutDateFormatted]);
```

### 4. Earnings Summary Query

**Location:** `backend/src/models/Earnings.js` - `getEarningsSummary()`

**API Endpoint:** `GET /api/earnings/summary`

**Returns:**
```json
{
  "available_balance": 5000.00,
  "withdrawn_amount": 15000.00,
  "total_earnings": 20000.00,
  "upcoming_payout": 5000.00
}
```

## Utility Functions

### getNextSaturday()

**Location:** `backend/src/utils/dateUtils.js`

**Purpose:** Calculate the next Saturday date for payout scheduling

**Usage:**
```javascript
const { getNextSaturday } = require('../utils/dateUtils');
const nextSaturday = getNextSaturday(); // Returns Date object
```

**Logic:**
- If today is Saturday, returns today
- Otherwise, returns the next upcoming Saturday

## Webhook Configuration

### Required Webhook Events

Configure these events in Razorpay Dashboard → Settings → Webhooks:

1. **`payment.captured`** - Payment successfully captured
2. **`payment.authorized`** - Payment authorized (for manual capture)
3. **`payment.transferred`** - Payment settled to merchant account
4. **`payment.settled`** - Payment settled (alternative event)
5. **`payment.failed`** - Payment failed
6. **`payout.processed`** - Payout processed successfully
7. **`payout.completed`** - Payout completed (alternative event)

### Webhook Endpoint

```
POST /api/razorpay/webhook
```

**Security:**
- Verifies Razorpay signature using `X-Razorpay-Signature` header
- Requires `RAZORPAY_WEBHOOK_SECRET` environment variable

## API Endpoints

### Get Earnings Summary

**Endpoint:** `GET /api/earnings/summary`

**Authentication:** Required (Partner or Organization)

**Response:**
```json
{
  "success": true,
  "data": {
    "available_balance": 5000.00,
    "withdrawn_amount": 15000.00,
    "total_earnings": 20000.00,
    "upcoming_payout": 5000.00,
    "completed_sessions": 25,
    "revenue_by_month": [
      {
        "month": "2025-01-01T00:00:00.000Z",
        "revenue": 10000.00
      }
    ]
  }
}
```

## Business Rules

### Payment Distribution

- **100% of booking fee** goes to the partner/organization
- No platform cut or fees deducted
- Amount in earnings table = amount paid by user

### Settlement Timeline

- Payments are typically settled by Razorpay in **T+2 or T+3 days** (2-3 business days after capture)
- Earnings remain in `pending` status until settlement webhook is received
- Once settled, earnings become `available` for withdrawal

### Payout Schedule

- **Weekly batch payouts on Saturdays**
- All `available` earnings are included in the payout batch
- Payout date is set to next Saturday when earnings become `available`
- After payout webhook, earnings status changes to `withdrawn`

### Error Handling

- Earnings creation failures don't block payment verification
- Webhook processing errors are logged but don't fail the webhook response
- Manual intervention may be required for edge cases

## Testing

### Test Scenarios

1. **Payment Capture → Earnings Creation**
   - Verify earnings record created with `status = 'pending'`
   - Check partner_id and amount are correct

2. **Payment Settlement → Status Update**
   - Trigger `payment.transferred` webhook
   - Verify status changes to `'available'`
   - Check `payout_date` is set to next Saturday

3. **Payout Processing → Final Status**
   - Trigger `payout.processed` webhook
   - Verify status changes to `'withdrawn'`
   - Check multiple earnings are updated correctly

4. **Summary Calculations**
   - Create test earnings with different statuses
   - Verify calculations match expected values

### Test Data Setup

```sql
-- Create test earnings records
INSERT INTO earnings (recipient_id, recipient_type, amount, status, payout_date)
VALUES 
  (1, 'partner', 1000.00, 'available', '2025-01-17'),
  (1, 'partner', 2000.00, 'withdrawn', '2025-01-10'),
  (1, 'partner', 500.00, 'pending', NULL);
```

## Troubleshooting

### Common Issues

1. **Earnings not created after payment**
   - Check payment verification logs
   - Verify partner_id exists in order metadata
   - Check for errors in earnings creation try-catch block

2. **Status not updating from pending to available**
   - Verify webhook is configured correctly
   - Check webhook signature verification
   - Ensure `payment.transferred` or `payment.settled` events are enabled

3. **Payout not updating status to withdrawn**
   - Verify payout webhook is received
   - Check payout_date matching logic
   - Ensure payout_date format matches (YYYY-MM-DD)

4. **Incorrect calculations**
   - Verify status values are correct
   - Check for cancelled or failed payments included
   - Review SQL query in `getEarningsSummary()`

## Environment Variables

Required environment variables:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Related Files

- `backend/src/models/Earnings.js` - Earnings model and queries
- `backend/src/controllers/razorpayController.js` - Payment and webhook handlers
- `backend/src/controllers/earningsController.js` - Earnings API endpoints
- `backend/src/utils/dateUtils.js` - Date utility functions
- `frontend/src/components/earnings/EarningsTab.jsx` - Frontend earnings display

## Future Enhancements

1. **Organization Earnings Aggregation**
   - Aggregate earnings across all partners in an organization
   - Support organization-level payout processing

2. **Payout Record Creation**
   - Create payout records in `payouts` table
   - Link earnings to payout records via `payout_id`

3. **Refund Handling**
   - Handle refund webhooks
   - Update earnings status to `cancelled` or create negative earnings

4. **Manual Payout Processing**
   - Admin interface for manual payout processing
   - Bulk status updates for payouts

5. **Earnings History**
   - Detailed earnings transaction history
   - Filtering and search capabilities

## Support

For issues or questions:
1. Check webhook logs in `razorpay_webhooks` table
2. Review earnings records in database
3. Verify Razorpay dashboard for payment status
4. Check application logs for error messages

