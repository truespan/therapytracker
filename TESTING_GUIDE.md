# Subscription Payment Flow - Testing Guide

## Overview
This guide provides step-by-step instructions to test the fixed subscription payment flow for newly signed-up therapists.

## Prerequisites

### Backend Setup
1. **Razorpay Configuration**
   - Ensure Razorpay keys are configured in `backend/.env`:
     ```env
     RAZORPAY_KEY_ID=rzp_live_xxxxx
     RAZORPAY_KEY_SECRET=your_secret_key
     ```
   - For testing, you can use test keys:
     ```env
     RAZORPAY_KEY_ID=rzp_test_xxxxx
     RAZORPAY_KEY_SECRET=your_test_secret_key
     ```

2. **Database Setup**
   - Ensure at least one active paid subscription plan exists
   - Check with this query:
     ```sql
     SELECT id, plan_name, plan_type, is_active, 
            individual_monthly_price, individual_quarterly_price, individual_yearly_price
     FROM subscription_plans 
     WHERE is_active = true 
       AND plan_type IN ('individual', 'common')
       AND (individual_monthly_price > 0 
            OR individual_quarterly_price > 0 
            OR individual_yearly_price > 0);
     ```

3. **Organization Setup**
   - Ensure there's at least one TheraPTrack-controlled organization:
     ```sql
     SELECT id, name, theraptrack_controlled 
     FROM organizations 
     WHERE theraptrack_controlled = true;
     ```

### Frontend Setup
1. Ensure frontend is running: `npm start` in `frontend/` directory
2. Ensure backend is running: `npm start` in `backend/` directory

## Test Scenarios

### Scenario 1: Successful Payment Flow (Happy Path)

**Steps:**
1. **Create Therapist Signup Link**
   - Login as an organization admin (from a TheraPTrack-controlled org)
   - Go to Organization Settings
   - Generate a therapist signup link
   - Copy the link

2. **Therapist Signup**
   - Open the signup link in a new browser/incognito window
   - Fill in all required fields:
     - Name
     - Email (use a valid email)
     - Contact (with country code, e.g., +919876543210)
     - Sex
     - Age
     - Qualification
     - Password
   - Submit the form
   - You should see: "Account created successfully! Please check your email to verify your account."

3. **Email Verification**
   - Check the email inbox
   - Click the verification link
   - You should see: "Email verified successfully! You can now log in."

4. **First Login**
   - Go to login page
   - Enter email and password
   - Click Login
   - **Expected:** Terms & Conditions modal appears

5. **Accept Terms**
   - Read the terms (or scroll to bottom)
   - Check "I accept the Terms & Conditions"
   - Click "Accept & Continue"
   - **Expected:** Terms modal closes, Subscription Plan modal appears immediately

6. **Subscription Plan Selection**
   - **Verify Modal Behavior:**
     - ✅ Modal is displayed with paid plans
     - ✅ No close button (X) in header
     - ✅ Cannot close by clicking backdrop
     - ✅ Billing period selector shows: Monthly, Quarterly, Yearly
   
7. **Select Plan and Billing Period**
   - Choose a billing period (e.g., Monthly)
   - Click on a plan card to select it
   - **Expected:** Plan card gets highlighted with checkmark
   - Footer shows: "Selected: [Plan Name]"

8. **Initiate Payment**
   - Click "Select & Pay" button
   - **Expected:** 
     - Button shows "Processing..."
     - Razorpay checkout modal opens within 1-2 seconds
     - Razorpay modal shows correct amount and plan details

9. **Complete Payment**
   - In Razorpay modal, enter payment details:
     - **Test Mode:** Use test card: 4111 1111 1111 1111, any future expiry, any CVV
     - **Live Mode:** Use real payment method
   - Click Pay
   - **Expected:**
     - Payment processes successfully
     - Razorpay modal closes
     - Subscription Plan modal closes
     - User is redirected to Partner Dashboard
     - Dashboard loads successfully

10. **Verify Subscription**
    - Go to Partner Settings
    - Scroll to "Subscription Plan" section
    - **Expected:** Shows the selected plan with correct billing period

**Success Criteria:**
- ✅ Payment gateway opens successfully
- ✅ Payment completes without errors
- ✅ Subscription is assigned to therapist
- ✅ User can access dashboard
- ✅ No modal reappears on page refresh

---

### Scenario 2: Payment Cancellation

**Steps:**
1. Follow steps 1-8 from Scenario 1
2. When Razorpay modal opens, click the close button (X) or press ESC
3. **Expected:**
   - Razorpay modal closes
   - Subscription Plan modal remains open
   - Error message appears: "Payment was cancelled. Please select a plan and try again when ready."
   - User can select plan again and retry

**Success Criteria:**
- ✅ Error message is user-friendly
- ✅ Modal doesn't close
- ✅ User can retry payment
- ✅ No subscription is assigned

---

### Scenario 3: Payment Failure

**Steps:**
1. Follow steps 1-8 from Scenario 1
2. In Razorpay modal, use an invalid card (if test mode: 4000 0000 0000 0002)
3. **Expected:**
   - Payment fails
   - Razorpay shows error
   - Subscription Plan modal shows error message
   - User can retry

**Success Criteria:**
- ✅ Appropriate error message shown
- ✅ Modal doesn't close
- ✅ User can retry payment
- ✅ No subscription is assigned

---

### Scenario 4: Network Error During Payment

**Steps:**
1. Follow steps 1-7 from Scenario 1
2. Open browser DevTools → Network tab
3. Set network to "Offline"
4. Click "Select & Pay"
5. **Expected:**
   - Error message appears: "Failed to process subscription. Please try again."
   - Modal remains open

**Success Criteria:**
- ✅ Graceful error handling
- ✅ User can retry when network is restored

---

### Scenario 5: No Paid Plans Available

**Steps:**
1. **Admin Action:** Deactivate all paid subscription plans
   ```sql
   UPDATE subscription_plans 
   SET is_active = false 
   WHERE plan_type IN ('individual', 'common')
     AND (individual_monthly_price > 0 
          OR individual_quarterly_price > 0 
          OR individual_yearly_price > 0);
   ```
2. Follow steps 1-5 from Scenario 1
3. **Expected:**
   - Subscription Plan modal appears
   - Shows message: "No subscription plans available at the moment."
   - Close button (X) is visible in header
   - "Close" button is visible in footer
   - Can close modal by clicking backdrop

4. Close the modal
5. **Expected:**
   - Modal closes
   - User can access dashboard (since no paid plans are enforced)

**Success Criteria:**
- ✅ User is informed about no plans
- ✅ User can close modal
- ✅ User can access platform

**Cleanup:**
```sql
-- Re-activate plans after test
UPDATE subscription_plans 
SET is_active = true 
WHERE plan_type IN ('individual', 'common');
```

---

### Scenario 6: Multiple Billing Periods

**Steps:**
1. Follow steps 1-7 from Scenario 1
2. Select "Monthly" billing
3. Note the prices displayed
4. Switch to "Quarterly" billing
5. **Expected:** Prices update to quarterly pricing
6. Switch to "Yearly" billing
7. **Expected:** 
   - Prices update to yearly pricing
   - "Save 20%" badge appears on Yearly button
8. Select a plan and complete payment with yearly billing

**Success Criteria:**
- ✅ Prices update correctly for each billing period
- ✅ Payment amount matches selected billing period
- ✅ Subscription is created with correct billing period

---

### Scenario 7: Non-TheraPTrack Controlled Organization

**Steps:**
1. **Admin Action:** Create or use an organization with `theraptrack_controlled = false`
2. Create a therapist account for this organization
3. Verify email and login
4. **Expected:**
   - Terms modal appears (if not accepted)
   - Subscription Plan modal DOES NOT appear
   - User goes directly to dashboard
   - In Partner Settings, subscription section shows: "No subscription plan assigned to you."

**Success Criteria:**
- ✅ Modal doesn't appear for non-controlled orgs
- ✅ User can access dashboard
- ✅ Organization admin must assign subscription

---

### Scenario 8: Existing Therapist (Already Has Subscription)

**Steps:**
1. Login as a therapist who already has an active subscription
2. **Expected:**
   - No subscription modal appears
   - User goes directly to dashboard

**Success Criteria:**
- ✅ Modal only appears for new therapists without subscription
- ✅ Existing users are not interrupted

---

### Scenario 9: Subscription Expiry

**Steps:**
1. **Admin Action:** Set a therapist's subscription end date to the past
   ```sql
   UPDATE partners 
   SET subscription_end_date = '2024-01-01' 
   WHERE id = [therapist_id];
   ```
2. Login as that therapist
3. **Expected:**
   - Subscription Plan modal appears
   - User must select and pay for a new subscription

**Success Criteria:**
- ✅ Expired subscriptions trigger modal
- ✅ User can renew subscription

---

## Browser Compatibility Testing

Test the payment flow on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

## Performance Testing

**Metrics to Check:**
- Time from clicking "Select & Pay" to Razorpay modal opening: < 2 seconds
- Time from payment completion to dashboard redirect: < 3 seconds
- Modal responsiveness on slow networks: Graceful loading states

## Security Testing

**Verify:**
- [ ] Payment signature is verified on backend
- [ ] Cannot bypass modal by manipulating frontend
- [ ] Cannot close modal when paid plans are available
- [ ] Cannot access dashboard without subscription (for new therapists)
- [ ] Razorpay keys are not exposed in frontend code
- [ ] Payment details are not logged in browser console

## Common Issues and Solutions

### Issue: Razorpay modal doesn't open
**Possible Causes:**
- Razorpay keys not configured
- Network error
- Razorpay script failed to load

**Solution:**
- Check browser console for errors
- Verify Razorpay keys in backend `.env`
- Check network connectivity

### Issue: Payment succeeds but subscription not assigned
**Possible Causes:**
- Payment verification failed
- Backend error during subscription assignment

**Solution:**
- Check backend logs
- Verify Razorpay webhook signature
- Check database for payment records

### Issue: Modal appears every time on login
**Possible Causes:**
- Subscription not properly assigned
- Database not updated

**Solution:**
- Check `partners` table for `subscription_plan_id`
- Check `partner_subscriptions` table for records
- Verify `subscription_end_date` is in the future

### Issue: "No subscription plans available" message
**Possible Causes:**
- All paid plans are deactivated
- Plans are not marked as active in database

**Solution:**
- Check `subscription_plans` table
- Ensure at least one paid plan has `is_active = true`

## Rollback Plan

If critical issues are found in production:

1. **Immediate Mitigation:**
   - Deactivate all paid plans temporarily
   - This allows therapists to close the modal and access the platform

2. **Revert Changes:**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

3. **Notify Users:**
   - Send email to affected therapists
   - Provide alternative signup method

## Post-Deployment Monitoring

**Monitor for 48 hours:**
- Payment success rate
- Payment failure rate
- User complaints
- Backend error logs
- Razorpay webhook logs

**Key Metrics:**
- Payment success rate should be > 95%
- Modal close rate (without payment) should be < 5%
- Average time to complete payment: < 5 minutes

## Support Contact

If users face payment issues:
1. Check backend logs for errors
2. Verify Razorpay dashboard for payment status
3. Contact Razorpay support if needed
4. Manually assign subscription if payment succeeded but not reflected

