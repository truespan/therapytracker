# Earnings Tab - Quick Testing Checklist

## Quick Test (15 minutes)

### 1. Test Pending Earnings (5 min)
```bash
# Step 1: Create a booking with payment
- Go to therapist public profile
- Book a slot and complete Razorpay payment
- Note payment ID from Razorpay dashboard

# Step 2: Check Earnings Tab
- Login as therapist
- Go to Earnings tab
- Verify: "Pending Earnings" shows payment amount

# Step 3: Database Verification
SELECT * FROM earnings WHERE razorpay_payment_id = 'pay_xxxxx';
# Expected: status = 'pending', payout_date = NULL
```

**✅ Pass Criteria:** Payment amount appears in "Pending Earnings" within 1 minute

---

### 2. Test Available Balance (2 min - if settlement already occurred)
```bash
# Check if any payments have settled
SELECT * FROM earnings WHERE status = 'available';

# If yes, verify in UI:
- "Available Balance" = sum of available earnings
- "Pending Earnings" = sum of pending earnings
```

**✅ Pass Criteria:** Available balance matches database query

---

### 3. Test Total Earnings (3 min)
```bash
# Database check
SELECT 
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available,
  SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as withdrawn,
  SUM(amount) as total
FROM earnings
WHERE recipient_id = [partner_id] AND recipient_type = 'partner';

# UI check
- Verify: Total Earnings = pending + available + withdrawn
```

**✅ Pass Criteria:** Total Earnings = sum of all three categories

---

### 4. Test Withdrawn Amount (2 min)
```bash
# Check withdrawn earnings
SELECT SUM(amount) FROM earnings 
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
AND status = 'withdrawn';

# UI check
- Verify: "Withdrawn Amount" matches query result
```

**✅ Pass Criteria:** Withdrawn amount matches database

---

### 5. Visual Checks (3 min)
- [ ] All amounts formatted as ₹X,XXX
- [ ] "Revenue by Month" chart displays
- [ ] "Completed Sessions" count is reasonable
- [ ] No error messages
- [ ] Loading states work

---

## Production URLs

**Frontend:** https://therapy-tracker.onrender.com  
**Backend API:** https://therapy-tracker-api.onrender.com/api  
**Razorpay Dashboard:** https://dashboard.razorpay.com

---

## Quick SQL Queries

### Check All Earnings for a Partner
```sql
SELECT 
  id,
  razorpay_payment_id,
  amount,
  status,
  payout_date,
  created_at
FROM earnings
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
ORDER BY created_at DESC;
```

### Check Earnings Summary
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM earnings
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
GROUP BY status;
```

### Find Recent Payments
```sql
SELECT 
  rp.razorpay_payment_id,
  rp.amount,
  rp.status as payment_status,
  rp.created_at,
  e.status as earnings_status,
  e.amount as earnings_amount
FROM razorpay_payments rp
LEFT JOIN earnings e ON rp.razorpay_payment_id = e.razorpay_payment_id
WHERE rp.customer_type = 'user'
ORDER BY rp.created_at DESC
LIMIT 10;
```

---

## Common Test Scenarios

### Scenario A: New Partner (No Earnings)
**Expected:**
- Pending Earnings: ₹0
- Available Balance: ₹0
- Total Earnings: ₹0
- Withdrawn Amount: ₹0

### Scenario B: One Pending Payment (₹500)
**Expected:**
- Pending Earnings: ₹500
- Available Balance: ₹0
- Total Earnings: ₹500
- Withdrawn Amount: ₹0

### Scenario C: One Settled Payment (₹500)
**Expected:**
- Pending Earnings: ₹0
- Available Balance: ₹500
- Total Earnings: ₹500
- Withdrawn Amount: ₹0

### Scenario D: Mixed Status (₹500 pending, ₹1000 available, ₹2000 withdrawn)
**Expected:**
- Pending Earnings: ₹500
- Available Balance: ₹1,000
- Total Earnings: ₹3,500
- Withdrawn Amount: ₹2,000

---

## Quick Troubleshooting

### Problem: Pending Earnings = 0 after payment
**Fix:** Check webhook logs, verify order notes contain partner_id

### Problem: Available Balance not updating
**Fix:** Check if payment settled in Razorpay, manually trigger webhook

### Problem: Amounts don't match
**Fix:** Check for duplicate earnings records, verify currency conversion

---

## Manual Settlement Simulation (Testing Only)

```sql
-- Simulate payment settlement
UPDATE earnings
SET status = 'available',
    payout_date = CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7),
    updated_at = CURRENT_TIMESTAMP
WHERE razorpay_payment_id = 'pay_xxxxx'
AND status = 'pending';
```

---

## Test Report Template

```
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: Production/Staging

Test 1: Pending Earnings
- Payment ID: pay_xxxxx
- Amount: ₹XXX
- Status: ✅ PASS / ❌ FAIL
- Notes: 

Test 2: Available Balance
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP (no settled payments)
- Notes:

Test 3: Total Earnings
- Expected: ₹XXX
- Actual: ₹XXX
- Status: ✅ PASS / ❌ FAIL
- Notes:

Test 4: Withdrawn Amount
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP (no withdrawals)
- Notes:

Overall: ✅ ALL PASS / ❌ ISSUES FOUND
```

---

**Quick Reference:** See `EARNINGS_TESTING_GUIDE.md` for detailed testing instructions.
