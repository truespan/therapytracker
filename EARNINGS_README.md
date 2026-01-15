# Earnings Tab Testing Documentation

## 📖 Introduction

Welcome to the Earnings Tab testing documentation for the Therapy Tracker application. This comprehensive guide will help you test and verify that all Razorpay booking transactions are correctly tracked and displayed in the earnings tab.

## 🎯 What Gets Tested

The earnings tab displays four key metrics for therapists/partners:

1. **💰 Pending Earnings** - Payments captured but awaiting Razorpay settlement (T+2/T+3 days)
2. **💵 Available Balance** - Payments settled by Razorpay, ready for withdrawal
3. **📊 Total Earnings** - Sum of all earnings (pending + available + withdrawn)
4. **📤 Withdrawn Amount** - Total payments transferred to partner bank accounts

## 📚 Documentation Structure

### Start Here
- **[EARNINGS_TESTING_SUMMARY.md](EARNINGS_TESTING_SUMMARY.md)** - Overview and quick start guide

### For Testing
- **[EARNINGS_QUICK_TEST.md](EARNINGS_QUICK_TEST.md)** - 15-minute quick test checklist
- **[EARNINGS_TESTING_GUIDE.md](EARNINGS_TESTING_GUIDE.md)** - Comprehensive testing guide with detailed steps

### For Understanding
- **[EARNINGS_FLOW_DIAGRAM.md](EARNINGS_FLOW_DIAGRAM.md)** - Visual diagrams and flow charts

## 🚀 Quick Start Guide

### Option 1: Quick Test (15 minutes)
Perfect for smoke testing or quick verification:

```bash
1. Read: EARNINGS_QUICK_TEST.md
2. Follow the 5-step checklist
3. Use the provided SQL queries
4. Fill out the test report template
```

### Option 2: Comprehensive Test (1-2 hours)
For thorough testing or investigating issues:

```bash
1. Read: EARNINGS_TESTING_GUIDE.md
2. Follow all 4 detailed test scenarios
3. Verify each component thoroughly
4. Document all findings
```

### Option 3: Learn the System (30 minutes)
To understand how earnings tracking works:

```bash
1. Read: EARNINGS_FLOW_DIAGRAM.md
2. Study the lifecycle diagram
3. Review the state machine
4. Understand database relationships
```

## 📋 Testing Checklist

### Before You Start
- [ ] Access to production environment
- [ ] Razorpay dashboard access
- [ ] Database access (for verification)
- [ ] Test payment methods ready
- [ ] Backend logs accessible

### Test Execution
- [ ] Test 1: Pending Earnings (after payment capture)
- [ ] Test 2: Available Balance (after T+2/T+3 settlement)
- [ ] Test 3: Total Earnings (calculation accuracy)
- [ ] Test 4: Withdrawn Amount (after payout)
- [ ] Visual checks (formatting, charts, counts)

### After Testing
- [ ] Complete test report
- [ ] Document any issues found
- [ ] Share findings with team
- [ ] Create tickets for bugs

## 🔑 Key Concepts

### Earnings States
```
PENDING → AVAILABLE → WITHDRAWN
   ↓
HELD / CANCELLED (edge cases)
```

### Timeline
```
Day 0: Payment Captured → Pending Earnings
Day 2-3: Payment Settled → Available Balance
Day 7: Payout Processed → Withdrawn Amount
```

### Calculation
```
Total Earnings = Pending + Available + Withdrawn
```

## 🛠️ Essential Tools

### SQL Queries
```sql
-- Check all earnings for a partner
SELECT * FROM earnings 
WHERE recipient_id = [partner_id] 
AND recipient_type = 'partner'
ORDER BY created_at DESC;

-- Verify earnings summary
SELECT 
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available,
  SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as withdrawn,
  SUM(amount) as total
FROM earnings
WHERE recipient_id = [partner_id] AND recipient_type = 'partner';
```

### Backend Logs
```bash
# Search for earnings creation
grep "EARNINGS" backend.log | grep "Created earnings record"

# Search for settlement updates
grep "EARNINGS" backend.log | grep "Updated earnings status to 'available'"

# Search for payout updates
grep "EARNINGS" backend.log | grep "withdrawn"
```

## 🌐 Environment URLs

### Production
- **Frontend:** https://therapy-tracker.onrender.com
- **Backend API:** https://therapy-tracker-api.onrender.com/api
- **Razorpay Dashboard:** https://dashboard.razorpay.com

### Testing
- Use production partner/therapist credentials
- Test with real Razorpay payments (test mode or live mode)
- Verify in both UI and database

## 📊 Example Test Scenario

### Complete Flow Test
```
Step 1: Create Booking
- Client books appointment
- Completes Razorpay payment (₹500)
- Payment ID: pay_test123

Step 2: Verify Pending (Immediate)
- UI: Pending Earnings = ₹500
- DB: status = 'pending'
- Logs: "Created earnings record for partner"

Step 3: Wait for Settlement (T+2/T+3)
- Razorpay settles payment
- Webhook: payment.settled received

Step 4: Verify Available
- UI: Available Balance = ₹500, Pending = ₹0
- DB: status = 'available', payout_date = [Saturday]
- Logs: "Updated earnings status to 'available'"

Step 5: Wait for Payout (Saturday)
- Admin processes payout
- Webhook: payout.processed received

Step 6: Verify Withdrawn
- UI: Withdrawn Amount = ₹500, Available = ₹0
- DB: status = 'withdrawn'
- Total Earnings = ₹500 (unchanged throughout)
```

## 🐛 Common Issues

### Issue 1: Earnings Not Created
**Symptom:** Payment successful but Pending Earnings = ₹0

**Check:**
1. Razorpay webhook received?
2. Order notes contain `partner_id`?
3. Payment type recognized as `booking_fee`?

**Fix:** Verify webhook configuration and order metadata

---

### Issue 2: Available Balance Not Updating
**Symptom:** Payment settled but still shows as pending

**Check:**
1. Payment actually settled in Razorpay?
2. Settlement webhook received?
3. Webhook signature valid?

**Fix:** Manually trigger settlement webhook or check webhook secret

---

### Issue 3: Wrong Amounts
**Symptom:** UI shows different amount than expected

**Check:**
1. Duplicate earnings records?
2. Currency conversion (paise vs rupees)?
3. Fee settings correct?

**Fix:** Remove duplicates, verify fee configuration

## 📞 Support

### For Testing Questions
- Refer to the comprehensive testing guide
- Check the flow diagrams for understanding
- Use the quick test for reference

### For Issues Found
1. Document using test report template
2. Include payment ID, partner ID, screenshots
3. Attach database query results
4. Provide backend logs
5. Escalate to development team

### Escalation Priority
- **🔴 Critical:** Earnings not created → Immediate
- **🟠 High:** Wrong amounts → 24 hours
- **🟡 Medium:** UI issues → 48 hours
- **🟢 Low:** Minor formatting → Next sprint

## 📝 Test Report Template

```markdown
# Earnings Tab Test Report

**Date:** [YYYY-MM-DD]
**Tester:** [Name]
**Environment:** Production
**Partner ID:** [ID]

## Test Results

### 1. Pending Earnings
- Payment ID: pay_xxxxx
- Amount: ₹XXX
- Status: ✅ PASS / ❌ FAIL
- Notes: 

### 2. Available Balance
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP
- Notes:

### 3. Total Earnings
- Expected: ₹XXX
- Actual: ₹XXX
- Status: ✅ PASS / ❌ FAIL
- Notes:

### 4. Withdrawn Amount
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIP
- Notes:

## Issues Found
[List any issues]

## Overall Status
✅ ALL TESTS PASSED / ❌ ISSUES FOUND

## Recommendations
[Any recommendations]
```

## 🎓 Learning Path

### For New Testers
1. Start with **EARNINGS_TESTING_SUMMARY.md** (15 min)
2. Study **EARNINGS_FLOW_DIAGRAM.md** (20 min)
3. Practice with **EARNINGS_QUICK_TEST.md** (15 min)
4. Refer to **EARNINGS_TESTING_GUIDE.md** as needed

### For Experienced Testers
1. Use **EARNINGS_QUICK_TEST.md** for routine testing
2. Refer to **EARNINGS_TESTING_GUIDE.md** for edge cases
3. Use **EARNINGS_FLOW_DIAGRAM.md** for troubleshooting

### For Developers
1. Study **EARNINGS_FLOW_DIAGRAM.md** for architecture
2. Review **EARNINGS_TESTING_GUIDE.md** for verification queries
3. Use test scenarios for debugging

## 🔄 Continuous Testing

### Daily
- Quick smoke test after deployments
- Verify new payments appear in pending
- Check for any error messages

### Weekly
- Comprehensive test of all four metrics
- Verify settlement transitions (T+2/T+3)
- Check payout processing (Saturdays)

### Monthly
- Full regression test
- Verify historical data accuracy
- Test edge cases and error handling

## 📈 Success Metrics

### Testing Coverage
- ✅ All payment types tested (booking, public, event)
- ✅ All states tested (pending, available, withdrawn)
- ✅ All calculations verified (pending, available, total, withdrawn)
- ✅ All timelines tested (immediate, T+2/T+3, weekly)

### Quality Indicators
- ✅ 100% of payments tracked correctly
- ✅ 0% discrepancy between UI and database
- ✅ All webhooks processed within 1 minute
- ✅ All settlements reflected within 1 hour

## 🎯 Conclusion

This documentation provides everything you need to:
- ✅ Understand how earnings tracking works
- ✅ Test all four earnings metrics thoroughly
- ✅ Verify data accuracy in production
- ✅ Troubleshoot common issues
- ✅ Report findings effectively

**Choose your path:**
- **Quick Test?** → Start with `EARNINGS_QUICK_TEST.md`
- **Comprehensive Test?** → Start with `EARNINGS_TESTING_GUIDE.md`
- **Need to Understand?** → Start with `EARNINGS_FLOW_DIAGRAM.md`
- **Overview First?** → Start with `EARNINGS_TESTING_SUMMARY.md`

---

**Happy Testing! 🚀**

**Last Updated:** January 15, 2026  
**Version:** 1.0  
**Maintained By:** Development Team

---

## 📄 Document Index

| Document | Purpose | Time Required | When to Use |
|----------|---------|---------------|-------------|
| [EARNINGS_README.md](EARNINGS_README.md) | This file - Overview and navigation | 5 min | Starting point |
| [EARNINGS_TESTING_SUMMARY.md](EARNINGS_TESTING_SUMMARY.md) | Quick overview and reference | 10 min | Quick reference |
| [EARNINGS_QUICK_TEST.md](EARNINGS_QUICK_TEST.md) | Fast testing checklist | 15 min | Smoke testing |
| [EARNINGS_TESTING_GUIDE.md](EARNINGS_TESTING_GUIDE.md) | Comprehensive testing guide | 1-2 hours | Thorough testing |
| [EARNINGS_FLOW_DIAGRAM.md](EARNINGS_FLOW_DIAGRAM.md) | Visual diagrams and flows | 30 min | Understanding system |
