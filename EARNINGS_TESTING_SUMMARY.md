# Earnings Tab Testing - Summary & Quick Start

## 📋 Overview

This directory contains comprehensive testing documentation for the **Earnings Tab** feature in the Therapy Tracker application. The earnings tab tracks therapist/partner earnings from Razorpay booking transactions through three stages:

1. **Pending Earnings** - Payments captured but not yet settled by Razorpay
2. **Available Balance** - Payments settled by Razorpay (T+2/T+3 days), ready for withdrawal
3. **Withdrawn Amount** - Payments transferred to partner/organization bank accounts

---

## 📚 Documentation Files

### 1. **EARNINGS_TESTING_GUIDE.md** (Comprehensive Guide)
- **Purpose:** Complete testing guide with detailed steps, SQL queries, and troubleshooting
- **Use When:** Performing thorough testing or investigating issues
- **Contents:**
  - Detailed test scenarios for all 4 metrics
  - Database verification queries
  - Common issues and solutions
  - Production environment access
  - Complete testing checklist

### 2. **EARNINGS_QUICK_TEST.md** (Quick Reference)
- **Purpose:** Fast 15-minute testing checklist
- **Use When:** Quick verification or smoke testing
- **Contents:**
  - Condensed test steps
  - Essential SQL queries
  - Quick troubleshooting tips
  - Test report template

### 3. **EARNINGS_FLOW_DIAGRAM.md** (Visual Guide)
- **Purpose:** Visual representation of earnings lifecycle
- **Use When:** Understanding the flow or explaining to others
- **Contents:**
  - Complete lifecycle diagram
  - State machine visualization
  - Database relationships
  - Timeline examples
  - UI component layout

---

## 🚀 Quick Start

### For Quick Testing (15 minutes)
```bash
# Read the quick test guide
cat EARNINGS_QUICK_TEST.md

# Follow the 5-step checklist
# 1. Test Pending Earnings (5 min)
# 2. Test Available Balance (2 min)
# 3. Test Total Earnings (3 min)
# 4. Test Withdrawn Amount (2 min)
# 5. Visual Checks (3 min)
```

### For Comprehensive Testing (1-2 hours)
```bash
# Read the full testing guide
cat EARNINGS_TESTING_GUIDE.md

# Follow all test scenarios:
# - Test 1: Pending Earnings (detailed)
# - Test 2: Available Balance (T+2/T+3)
# - Test 3: Total Earnings
# - Test 4: Withdrawn Amount
# - Additional verification points
```

### For Understanding the System
```bash
# Read the flow diagram
cat EARNINGS_FLOW_DIAGRAM.md

# Study:
# - Complete earnings lifecycle
# - State machine transitions
# - Database relationships
# - Timeline examples
```

---

## 🎯 What to Test

### 1. Pending Earnings ⏰
**What:** Payments captured by Razorpay but not yet settled

**When to Check:** Immediately after a booking payment is completed

**Expected Behavior:**
- Amount appears in "Pending Earnings" within 1 minute of payment
- Database: `status = 'pending'`, `payout_date = NULL`
- Webhook: `payment.captured` received and processed

**SQL Check:**
```sql
SELECT * FROM earnings 
WHERE status = 'pending' 
AND recipient_id = [partner_id];
```

---

### 2. Available Balance 💵
**What:** Payments settled by Razorpay, ready for withdrawal

**When to Check:** T+2 or T+3 days after payment (Razorpay settlement period)

**Expected Behavior:**
- "Pending Earnings" decreases
- "Available Balance" increases by same amount
- Database: `status = 'available'`, `payout_date = [next Saturday]`
- Webhook: `payment.settled` or `payment.transferred` received

**SQL Check:**
```sql
SELECT * FROM earnings 
WHERE status = 'available' 
AND recipient_id = [partner_id];
```

---

### 3. Total Earnings 💰
**What:** Sum of all earnings (pending + available + withdrawn)

**When to Check:** After any payment or status change

**Expected Behavior:**
- Total = Pending + Available + Withdrawn
- Total increases with new payments
- Total remains constant when status changes
- Never decreases (unless refund/cancellation)

**SQL Check:**
```sql
SELECT 
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available,
  SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as withdrawn,
  SUM(amount) as total
FROM earnings
WHERE recipient_id = [partner_id] AND recipient_type = 'partner';
```

---

### 4. Withdrawn Amount 📤
**What:** Total payments transferred to partner/organization bank account

**When to Check:** After payout processing (typically weekly on Saturdays)

**Expected Behavior:**
- "Available Balance" decreases
- "Withdrawn Amount" increases by same amount
- Database: `status = 'withdrawn'`, `payout_id` set
- Webhook: `payout.processed` or `payout.completed` received

**SQL Check:**
```sql
SELECT * FROM earnings 
WHERE status = 'withdrawn' 
AND recipient_id = [partner_id];
```

---

## 🔄 Complete Flow Example

```
Day 0 (Monday, 10:00 AM)
========================
Action: Client books appointment and pays ₹500
Result: 
  - Pending Earnings: ₹500
  - Available Balance: ₹0
  - Total Earnings: ₹500
  - Withdrawn Amount: ₹0

Day 2 (Wednesday, 3:00 PM)
==========================
Action: Razorpay settles payment
Result:
  - Pending Earnings: ₹0
  - Available Balance: ₹500
  - Total Earnings: ₹500 (unchanged)
  - Withdrawn Amount: ₹0

Day 5 (Saturday, 12:00 PM)
==========================
Action: Weekly payout processed
Result:
  - Pending Earnings: ₹0
  - Available Balance: ₹0
  - Total Earnings: ₹500 (unchanged)
  - Withdrawn Amount: ₹500
```

---

## 🔍 Key Verification Points

### ✅ Correct Behavior
- [ ] Payment appears in "Pending" within 1 minute
- [ ] "Pending" moves to "Available" after T+2/T+3 days
- [ ] "Available" moves to "Withdrawn" after payout
- [ ] "Total Earnings" always equals sum of all three
- [ ] Amounts formatted as ₹X,XXX (Indian Rupee)
- [ ] "Revenue by Month" chart displays correctly
- [ ] "Completed Sessions" count is accurate

### ❌ Issues to Watch For
- [ ] Earnings not created after payment
- [ ] Duplicate earnings records
- [ ] Wrong amounts (currency conversion issues)
- [ ] Status not updating after settlement
- [ ] Payout date not set to Saturday
- [ ] Total earnings calculation incorrect

---

## 🛠️ Essential SQL Queries

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

### Earnings Summary by Status
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

### Verify Earnings Match UI
```sql
SELECT 
  COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
  COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_balance,
  COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) as withdrawn_amount,
  COALESCE(SUM(CASE WHEN status IN ('available', 'withdrawn', 'pending') THEN amount ELSE 0 END), 0) as total_earnings
FROM earnings
WHERE recipient_id = [partner_id] AND recipient_type = 'partner';
```

---

## 🌐 Production Environment

### URLs
- **Frontend:** https://therapy-tracker.onrender.com
- **Backend API:** https://therapy-tracker-api.onrender.com/api
- **Razorpay Dashboard:** https://dashboard.razorpay.com

### Test Credentials
Use your production partner/therapist account credentials

### Database Access
Contact system administrator for production database access

---

## 🐛 Common Issues & Quick Fixes

### Issue 1: Pending Earnings = 0 after payment
**Symptoms:** Payment successful but earnings tab shows ₹0

**Quick Fix:**
1. Check Razorpay dashboard - is payment captured?
2. Check backend logs for webhook receipt
3. Verify database: `SELECT * FROM earnings WHERE razorpay_payment_id = 'pay_xxxxx'`
4. If missing, check order notes contain `partner_id`

### Issue 2: Available Balance not updating
**Symptoms:** Payment settled in Razorpay but still shows as pending

**Quick Fix:**
1. Check if payment actually settled (Razorpay dashboard → Settlements)
2. Check webhook logs for `payment.settled` event
3. Manually trigger settlement webhook (testing only)
4. Verify webhook secret configuration

### Issue 3: Amounts don't match
**Symptoms:** UI shows different amount than expected

**Quick Fix:**
1. Check for duplicate earnings: `SELECT razorpay_payment_id, COUNT(*) FROM earnings GROUP BY razorpay_payment_id HAVING COUNT(*) > 1`
2. Verify fee settings in partner profile
3. Check currency conversion (paise vs rupees)

---

## 📊 Test Report Template

```
EARNINGS TAB TEST REPORT
========================

Date: [YYYY-MM-DD]
Tester: [Name]
Environment: Production / Staging
Partner ID: [ID]

TEST RESULTS:
-------------

1. Pending Earnings
   Payment ID: pay_xxxxx
   Amount: ₹XXX
   Status: ✅ PASS / ❌ FAIL
   Notes: 

2. Available Balance
   Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP
   Notes:

3. Total Earnings
   Expected: ₹XXX
   Actual: ₹XXX
   Status: ✅ PASS / ❌ FAIL
   Notes:

4. Withdrawn Amount
   Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP
   Notes:

ISSUES FOUND:
-------------
[List any issues discovered]

OVERALL STATUS:
---------------
✅ ALL TESTS PASSED
❌ ISSUES FOUND (see above)

RECOMMENDATIONS:
----------------
[Any recommendations for fixes or improvements]
```

---

## 📞 Support & Escalation

### For Testing Questions
- Refer to `EARNINGS_TESTING_GUIDE.md` for detailed instructions
- Check `EARNINGS_FLOW_DIAGRAM.md` for visual understanding

### For Issues Found
1. Document the issue using the test report template
2. Include:
   - Payment ID
   - Partner ID
   - Expected vs Actual behavior
   - Screenshots
   - Database query results
   - Backend logs
3. Escalate to development team

### For Production Issues
- **Critical:** Earnings not being created → Immediate escalation
- **High:** Wrong amounts displayed → Escalate within 24 hours
- **Medium:** UI display issues → Escalate within 48 hours
- **Low:** Minor formatting issues → Log for next sprint

---

## 🎓 Learning Resources

### Understanding the System
1. Read `EARNINGS_FLOW_DIAGRAM.md` first
2. Study the state machine diagram
3. Review the timeline examples
4. Understand database relationships

### Preparing for Testing
1. Review `EARNINGS_QUICK_TEST.md` for overview
2. Read `EARNINGS_TESTING_GUIDE.md` sections relevant to your test
3. Prepare SQL queries and tools
4. Set up access to production environment

### During Testing
1. Follow the checklist step-by-step
2. Document all findings
3. Take screenshots for evidence
4. Run verification queries after each test

### After Testing
1. Complete the test report
2. Share findings with team
3. Create tickets for any issues found
4. Update documentation if needed

---

## 📝 Summary

The earnings tab testing ensures that:
1. ✅ All Razorpay payments are captured and tracked
2. ✅ Earnings move through states correctly (pending → available → withdrawn)
3. ✅ All amounts are calculated and displayed accurately
4. ✅ Settlement timing (T+2/T+3) is handled properly
5. ✅ Total earnings always equals the sum of all components

**Key Success Criteria:**
- Pending Earnings = Captured payments not yet settled
- Available Balance = Settled payments ready for withdrawal
- Total Earnings = Sum of pending + available + withdrawn
- Withdrawn Amount = Payments transferred to bank account

**Testing Time:**
- Quick Test: 15 minutes
- Comprehensive Test: 1-2 hours
- Full Regression: 2-3 hours (with settlement wait time)

---

**Last Updated:** January 15, 2026  
**Version:** 1.0  
**Maintained By:** Development Team
