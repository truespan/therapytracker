# Earnings Tab Production Testing Guide

## Overview
This guide provides step-by-step instructions to test the earnings tab functionality in production after successful Razorpay booking transactions.

## Earnings Flow Architecture

### Payment States
1. **Payment Captured** → Creates earnings record with `status = 'pending'`
2. **Payment Settled (T+2/T+3)** → Updates earnings to `status = 'available'` with `payout_date` set to next Saturday
3. **Payout Processed** → Updates earnings to `status = 'withdrawn'`

### Database Schema
```sql
CREATE TABLE earnings (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('partner', 'organization')),
    razorpay_payment_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) CHECK (status IN ('pending', 'available', 'held', 'withdrawn', 'cancelled')),
    session_id INTEGER,
    appointment_id INTEGER,
    payout_date DATE,
    payout_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Test Scenarios

### Test 1: Verify Pending Earnings After Payment Capture

**Objective:** Confirm that all captured Razorpay payments appear correctly in "Pending Earnings"

**Steps:**
1. **Create a Booking with Payment:**
   - As a client, navigate to a therapist's public profile or availability page
   - Select an available time slot
   - Complete the booking form with client details
   - Proceed to payment using Razorpay
   - Complete payment successfully (use test card: 4111 1111 1111 1111, any future expiry, any CVV)

2. **Verify Payment Capture:**
   - Check Razorpay Dashboard → Payments
   - Confirm payment status is "Captured"
   - Note the payment ID (e.g., `pay_xxxxxxxxxxxxx`)

3. **Check Earnings Tab (Therapist/Partner Dashboard):**
   - Login as the therapist/partner
   - Navigate to "Earnings" tab
   - **Expected Result:**
     - "Pending Earnings" card should show the payment amount
     - Amount should match the booking fee/session fee paid
     - Status: "Payment captured, waiting for Razorpay settlement (T+2/T+3 days)"

4. **Verify Database:**
   ```sql
   -- Check earnings record
   SELECT * FROM earnings 
   WHERE razorpay_payment_id = 'pay_xxxxxxxxxxxxx';
   
   -- Expected:
   -- status = 'pending'
   -- amount = [payment amount]
   -- payout_date = NULL
   -- recipient_id = [partner_id]
   -- recipient_type = 'partner'
   ```

5. **Check Backend Logs:**
   ```
   [EARNINGS] Created earnings record for partner [ID] ([Name]) 
   from booking payment [payment_id] (amount: [amount] [currency])
   ```

**Test Cases:**
- ✅ Single booking payment
- ✅ Multiple booking payments from different clients
- ✅ Public booking (full session fee)
- ✅ Registered user booking (booking fee only)
- ✅ Event enrollment payment

**Common Issues:**
- ❌ Earnings not created → Check webhook configuration
- ❌ Wrong amount → Verify fee settings in partner profile
- ❌ Missing partner_id → Check order notes/metadata

---

### Test 2: Verify Available Balance After Settlement (T+2/T+3)

**Objective:** Confirm that after Razorpay settles payments (T+2 or T+3 days), the "Available Balance" updates correctly

**Prerequisites:**
- Wait for Razorpay settlement period (typically T+2 or T+3 business days)
- OR manually trigger settlement webhook for testing

**Steps:**

#### Option A: Wait for Natural Settlement
1. **Wait for Settlement Period:**
   - Razorpay typically settles payments after 2-3 business days
   - Check Razorpay Dashboard → Settlements

2. **Monitor Webhook:**
   - When Razorpay settles payment, it sends `payment.settled` or `payment.transferred` webhook
   - Check backend logs for webhook receipt

3. **Verify Earnings Tab:**
   - Login as therapist/partner
   - Navigate to "Earnings" tab
   - **Expected Result:**
     - "Pending Earnings" should decrease by settled amount
     - "Available Balance" should increase by settled amount
     - "Available Balance" description: "Payment settled, ready for withdrawal (money in merchant account)"

#### Option B: Manual Testing (Development/Staging)
1. **Simulate Settlement Webhook:**
   ```bash
   # Send test webhook to your backend
   curl -X POST https://your-api-domain.com/api/razorpay/webhook \
     -H "Content-Type: application/json" \
     -H "x-razorpay-signature: [test_signature]" \
     -d '{
       "event": "payment.settled",
       "payload": {
         "payment": {
           "entity": {
             "id": "pay_xxxxxxxxxxxxx",
             "status": "captured",
             "amount": 50000,
             "currency": "INR"
           }
         }
       }
     }'
   ```

2. **Manually Update Database (Testing Only):**
   ```sql
   -- Update earnings status to 'available'
   UPDATE earnings
   SET status = 'available',
       payout_date = (SELECT CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7) + 
                      CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN 7 ELSE 0 END),
       updated_at = CURRENT_TIMESTAMP
   WHERE razorpay_payment_id = 'pay_xxxxxxxxxxxxx'
   AND status = 'pending';
   ```

3. **Refresh Earnings Tab:**
   - Reload the earnings page
   - Verify amounts updated correctly

**Verification Queries:**
```sql
-- Check earnings summary
SELECT 
  COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
  COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
  COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
  COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings
FROM earnings
WHERE recipient_id = [partner_id] AND recipient_type = 'partner';
```

**Expected Backend Logs:**
```
[EARNINGS] Updated earnings status to 'available' for payment pay_xxxxxxxxxxxxx, 
scheduled for payout on YYYY-MM-DD
```

**Test Cases:**
- ✅ Single payment settlement
- ✅ Batch settlement (multiple payments)
- ✅ Settlement after exactly T+2 days
- ✅ Settlement after T+3 days
- ✅ Payout date set to next Saturday

**Common Issues:**
- ❌ Available balance not updating → Check webhook delivery
- ❌ Wrong payout date → Verify date calculation logic
- ❌ Webhook signature verification failed → Check webhook secret

---

### Test 3: Verify Total Earnings Calculation

**Objective:** Confirm "Total Earnings" accurately reflects all earnings regardless of status

**Steps:**
1. **Create Multiple Transactions:**
   - Complete 3-5 booking transactions
   - Wait for some to settle (or manually update)
   - Optionally mark some as withdrawn

2. **Check Earnings Tab:**
   - Navigate to Earnings tab
   - **Expected Result:**
     - "Total Earnings" = Sum of all earnings (pending + available + withdrawn)
     - Formula: `pending_earnings + available_balance + withdrawn_amount`

3. **Verify Calculation:**
   ```sql
   -- Manual calculation
   SELECT 
     SUM(amount) as total_earnings,
     SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
     SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available,
     SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as withdrawn
   FROM earnings
   WHERE recipient_id = [partner_id] AND recipient_type = 'partner';
   ```

4. **Cross-Reference with UI:**
   - Total Earnings (UI) = total_earnings (DB)
   - Pending Earnings (UI) = pending (DB)
   - Available Balance (UI) = available (DB)
   - Withdrawn Amount (UI) = withdrawn (DB)

**Test Cases:**
- ✅ All earnings in pending state
- ✅ Mixed states (pending + available)
- ✅ Mixed states (pending + available + withdrawn)
- ✅ After new payment (total should increase)
- ✅ After settlement (total unchanged, distribution changes)

**Edge Cases:**
- ✅ Zero earnings (new partner)
- ✅ Large amounts (₹1,00,000+)
- ✅ Multiple currencies (if supported)

---

### Test 4: Verify Withdrawn Amount Display

**Objective:** Confirm "Withdrawn Amount" correctly shows total payouts made to partner/organization bank account

**Prerequisites:**
- Some earnings must be in 'withdrawn' status
- Actual payout processing (or manual simulation)

**Steps:**

#### Option A: Simulate Payout (Testing)
1. **Manually Mark Earnings as Withdrawn:**
   ```sql
   -- Update available earnings to withdrawn
   UPDATE earnings
   SET status = 'withdrawn',
       updated_at = CURRENT_TIMESTAMP
   WHERE recipient_id = [partner_id] 
   AND recipient_type = 'partner'
   AND status = 'available'
   AND payout_date <= CURRENT_DATE;
   ```

2. **Refresh Earnings Tab:**
   - **Expected Result:**
     - "Withdrawn Amount" increases by the withdrawn earnings
     - "Available Balance" decreases by the same amount
     - "Total Earnings" remains unchanged

#### Option B: Production Payout Flow
1. **Wait for Payout Processing:**
   - Payouts are typically processed on scheduled dates (e.g., weekly on Saturdays)
   - Check for `payout.processed` or `payout.completed` webhook

2. **Verify Webhook Handling:**
   ```
   [EARNINGS] Updated [N] earnings records to 'withdrawn' for payout [payout_id] on [date]
   ```

3. **Check Earnings Tab:**
   - "Withdrawn Amount" should reflect total payouts
   - Description: "Total payment transferred to partner/organization bank account"

**Verification:**
```sql
-- Check withdrawn earnings
SELECT 
  COUNT(*) as withdrawn_count,
  SUM(amount) as total_withdrawn,
  MIN(updated_at) as first_withdrawal,
  MAX(updated_at) as last_withdrawal
FROM earnings
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
AND status = 'withdrawn';
```

**Test Cases:**
- ✅ First payout (withdrawn amount = 0 → X)
- ✅ Multiple payouts over time
- ✅ Partial payout (some available, some withdrawn)
- ✅ Full payout (all available → withdrawn)

---

## Additional Verification Points

### 1. Completed Sessions Count
**Location:** Earnings Tab → "Completed Sessions" card

**Verification:**
```sql
-- Count completed sessions
SELECT COUNT(*) as completed_sessions
FROM therapy_sessions
WHERE partner_id = [partner_id]
AND session_date < NOW();
```

**Note:** This counts therapy sessions, not appointments. Ensure the count matches.

---

### 2. Revenue by Month Chart
**Location:** Earnings Tab → "Revenue by Month" chart

**Verification:**
```sql
-- Get revenue by month
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COALESCE(SUM(amount), 0) as revenue
FROM earnings
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
AND status IN ('available', 'withdrawn')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC
LIMIT 12;
```

**Expected:** Chart displays last 12 months of revenue (only settled/withdrawn earnings)

---

### 3. Currency Display
**Location:** All amount fields

**Verification:**
- Amounts formatted as ₹X,XXX (Indian Rupee format)
- No decimal places for whole amounts
- Consistent currency symbol across all cards

---

## Production Environment Access

### Frontend URLs
- **Production:** `https://therapy-tracker.onrender.com` (or your production domain)
- **Staging:** (if available)

### Backend API
- **Production:** `https://therapy-tracker-api.onrender.com/api`
- **Staging:** (if available)

### Razorpay Dashboard
- **Live Mode:** https://dashboard.razorpay.com/app/payments
- **Test Mode:** https://dashboard.razorpay.com/app/payments?mode=test

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Verify Razorpay webhook is configured and active
- [ ] Check backend logs are accessible
- [ ] Confirm database access for verification queries
- [ ] Ensure test payment methods are available

### Test 1: Pending Earnings
- [ ] Create booking with payment
- [ ] Verify payment captured in Razorpay
- [ ] Check "Pending Earnings" displays correct amount
- [ ] Verify database: `status = 'pending'`, `payout_date = NULL`
- [ ] Check backend logs for earnings creation

### Test 2: Available Balance (T+2/T+3)
- [ ] Wait for Razorpay settlement OR simulate webhook
- [ ] Verify "Pending Earnings" decreased
- [ ] Verify "Available Balance" increased by same amount
- [ ] Check database: `status = 'available'`, `payout_date` set
- [ ] Confirm payout date is next Saturday

### Test 3: Total Earnings
- [ ] Create multiple transactions (3-5)
- [ ] Verify "Total Earnings" = sum of all earnings
- [ ] Check calculation: pending + available + withdrawn
- [ ] Confirm total doesn't change when status changes
- [ ] Test with zero earnings (new partner)

### Test 4: Withdrawn Amount
- [ ] Simulate payout OR wait for actual payout
- [ ] Verify "Withdrawn Amount" increased
- [ ] Verify "Available Balance" decreased
- [ ] Check database: `status = 'withdrawn'`
- [ ] Confirm "Total Earnings" unchanged

### Additional Checks
- [ ] "Completed Sessions" count is accurate
- [ ] "Revenue by Month" chart displays correctly
- [ ] Currency formatting is consistent (₹X,XXX)
- [ ] All cards display correct descriptions
- [ ] Loading states work properly
- [ ] Error handling displays appropriate messages

---

## Common Issues and Troubleshooting

### Issue 1: Earnings Not Created After Payment
**Symptoms:** Payment successful but "Pending Earnings" is 0

**Possible Causes:**
1. Webhook not received
2. Order metadata missing `partner_id`
3. Payment type not recognized as booking fee

**Debug Steps:**
```sql
-- Check if payment exists
SELECT * FROM razorpay_payments WHERE razorpay_payment_id = 'pay_xxxxx';

-- Check order notes
SELECT notes FROM razorpay_orders WHERE razorpay_order_id = 'order_xxxxx';

-- Check for earnings record
SELECT * FROM earnings WHERE razorpay_payment_id = 'pay_xxxxx';
```

**Solution:**
- Verify webhook endpoint is accessible
- Check webhook signature verification
- Ensure order notes contain `payment_type: 'booking_fee'` and `partner_id`

---

### Issue 2: Available Balance Not Updating After Settlement
**Symptoms:** Payment settled in Razorpay but still shows as "Pending"

**Possible Causes:**
1. Settlement webhook not received
2. Webhook handler error
3. Payment ID mismatch

**Debug Steps:**
```bash
# Check webhook logs
grep "payment.settled" backend.log

# Check earnings status
SELECT * FROM earnings WHERE razorpay_payment_id = 'pay_xxxxx';
```

**Solution:**
- Manually trigger settlement webhook
- Update earnings status via SQL (testing only)
- Check webhook secret configuration

---

### Issue 3: Incorrect Amounts Displayed
**Symptoms:** Amounts don't match expected values

**Possible Causes:**
1. Currency conversion issue
2. Fee settings incorrect
3. Multiple earnings records for same payment

**Debug Steps:**
```sql
-- Check for duplicate earnings
SELECT razorpay_payment_id, COUNT(*) 
FROM earnings 
GROUP BY razorpay_payment_id 
HAVING COUNT(*) > 1;

-- Verify fee settings
SELECT session_fee, booking_fee, fee_currency 
FROM partners 
WHERE id = [partner_id];
```

**Solution:**
- Remove duplicate earnings records
- Verify fee settings in partner profile
- Check Razorpay payment amount (in paise vs rupees)

---

### Issue 4: Payout Date Calculation Wrong
**Symptoms:** `payout_date` is not the next Saturday

**Debug:**
```sql
-- Check payout dates
SELECT razorpay_payment_id, payout_date, 
       EXTRACT(DOW FROM payout_date) as day_of_week
FROM earnings
WHERE status = 'available';
-- day_of_week should be 6 (Saturday)
```

**Solution:**
- Verify `getNextSaturday()` function in `backend/src/utils/dateUtils.js`
- Check timezone handling

---

## Test Data Examples

### Sample Payment IDs
```
pay_test_1234567890abcd
pay_test_abcdef1234567890
pay_test_xyz9876543210
```

### Sample Amounts
```
Booking Fee: ₹500
Session Fee: ₹2,000
Event Fee: ₹1,500
```

### Sample Timeline
```
Day 0: Payment captured → Pending Earnings: ₹500
Day 2: Payment settled → Available Balance: ₹500, Pending: ₹0
Day 7: Payout processed → Withdrawn Amount: ₹500, Available: ₹0
```

---

## Reporting Issues

When reporting issues, include:
1. **Payment ID:** `pay_xxxxxxxxxxxxx`
2. **Partner ID:** Internal ID and partner_id string
3. **Expected Amount:** What should be displayed
4. **Actual Amount:** What is currently displayed
5. **Timestamp:** When the payment was made
6. **Screenshots:** Earnings tab and Razorpay dashboard
7. **Database Query Results:** Relevant earnings records
8. **Backend Logs:** Related to the payment/webhook

---

## Conclusion

This testing guide covers all four critical aspects of the earnings tab:
1. ✅ **Pending Earnings** - Payments captured but not yet settled
2. ✅ **Available Balance** - Payments settled and ready for withdrawal (T+2/T+3)
3. ✅ **Total Earnings** - Sum of all earnings (pending + available + withdrawn)
4. ✅ **Withdrawn Amount** - Total payouts made to bank account

Follow this guide systematically to ensure the earnings tracking system works correctly in production.

---

**Last Updated:** January 15, 2026
**Version:** 1.0
