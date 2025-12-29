# Subscription Upgrade and Cancellation Implementation

## Overview
This document summarizes the implementation of subscription upgrade/downgrade detection and cancellation functionality for the Therapy Tracker application.

## Implemented Features

### 1. Database Changes
**File**: `backend/database/migrations/add_subscription_cancellation.sql`
- Added `is_cancelled` boolean field to `partner_subscriptions` table
- Added `cancellation_date` timestamp field to `partner_subscriptions` table
- Added same fields to `organizations` table
- Created indexes for efficient querying on subscription end dates and cancellation status

### 2. Backend - Razorpay Subscriptions API
**File**: `backend/src/services/razorpayService.js`
- Enhanced `cancelSubscription()` method with `cancel_at_cycle_end` option
- Added `pauseSubscription()` method
- Added `resumeSubscription()` method
- Configured to cancel subscriptions at end of billing cycle by default

### 3. Backend - Model Updates

**File**: `backend/src/models/PartnerSubscription.js`
- Added `cancelSubscription(id)` - marks subscription as cancelled
- Added `cancelSubscriptionByPartnerId(partnerId)` - cancels most recent subscription
- Added `getActiveSubscription(partnerId)` - retrieves current active subscription
- Added `isActive(subscription)` - checks if subscription is currently active

**File**: `backend/src/models/Organization.js`
- Added `cancelSubscription(id)` - marks organization subscription as cancelled
- Added `getActiveSubscription(id)` - retrieves active subscription details
- Added `isSubscriptionActive(organization)` - checks subscription status

### 4. Backend - Controller Updates

**File**: `backend/src/controllers/partnerController.js`
- Added `cancelSubscription` endpoint handler
- Integrates with Razorpay API for subscription cancellation
- Updates database to mark subscription as cancelled

**File**: `backend/src/controllers/organizationController.js`
- Added `cancelOrganizationSubscription` endpoint handler
- Similar cancellation flow for organizations

**File**: `backend/src/controllers/subscriptionPlanController.js`
- Updated `getIndividualPlansForSelection` to exclude Free Plan
- Updated `getOrganizationPlansForSelection` to exclude Free Plan
- Users can no longer downgrade to Free Plan from paid plans

### 5. Backend - Route Updates
**File**: `backend/src/routes/index.js`
- Added `POST /partners/subscription/cancel` route
- Added `POST /organizations/subscription/cancel` route

### 6. Frontend - Utility Functions
**File**: `frontend/src/utils/subscriptionHelper.js`

Created comprehensive utility functions:
- `calculatePlanValue(plan, billingPeriod, userType)` - calculates total plan value
- `isUpgrade(currentPlan, currentBilling, newPlan, newBilling, userType)` - detects upgrades
- `isFreePlan(plan)` - checks if plan is Free Plan
- `isPaidPlan(plan)` - checks if plan is paid
- `isSubscriptionActive(subscription)` - checks subscription status
- `canCancelSubscription(subscription)` - determines if cancellation is allowed
- `getSubscriptionStatus(subscription)` - returns status label
- `formatEndDate(endDate)` - formats subscription end date
- `hasUpgradeablePlans(allPlans, currentPlan, currentBilling, userType)` - checks for available upgrades
- `getPlanSelectionButtonText(currentPlan, availablePlans, currentBilling, userType)` - determines button text

### 7. Frontend - API Integration
**File**: `frontend/src/services/api.js`
- Added `partnerAPI.cancelSubscription()` - cancels partner subscription
- Added `organizationAPI.cancelSubscription()` - cancels organization subscription

### 8. Frontend - UI Components

**File**: `frontend/src/components/common/CancellationConfirmDialog.jsx` (NEW)
- Modal dialog for subscription cancellation confirmation
- Displays subscription end date and important information
- Shows that access continues until end of billing period
- Confirms no refund will be issued

**File**: `frontend/src/components/common/SubscriptionStatusBadge.jsx` (NEW)
- Visual badge showing subscription status (Active, Cancelled, Expired)
- Displays subscription end date with appropriate label
- Color-coded for easy identification
- Dark mode support

**File**: `frontend/src/components/partner/PartnerSettings.jsx`
- Integrated subscription helper utilities
- Conditional button rendering:
  - Shows "Select Plan" for users without subscription
  - Shows "Upgrade" for users with upgradeable options
  - Hides button for users on highest plan
- Added "Cancel Subscription" button (only for active paid subscriptions)
- Integrated `CancellationConfirmDialog` component
- Added `SubscriptionStatusBadge` to subscription displays
- Added cancellation handler with backend API integration

## User Experience Flow

### Upgrade Detection
1. System calculates total value of current plan (price × billing period multiplier)
2. Compares with all available plans across all billing periods
3. If higher value plans exist, shows "Upgrade" button
4. If no higher value plans exist, hides the button
5. Free Plan users always see "Upgrade" if paid plans are available

### Plan Selection
1. User clicks "Select Plan" or "Upgrade" button
2. Modal shows all available plans (Free Plan excluded)
3. User selects plan and billing period
4. For paid plans: Razorpay payment flow is triggered
5. For Free Plan (existing users only): Direct assignment

### Cancellation Flow
1. User clicks "Cancel Subscription" button (only visible for active paid subscriptions)
2. Confirmation dialog appears with:
   - Subscription end date
   - Information about continued access
   - No refund notice
3. User confirms cancellation
4. Backend marks subscription as cancelled in database
5. Razorpay subscription is cancelled at cycle end
6. User retains access until subscription_end_date
7. Status badge updates to show "Cancelled" with end date

### Subscription Status Display
- **Active**: Green badge, shows "Renews on [date]"
- **Cancelled**: Yellow badge, shows "Active until [date]"
- **Expired**: Red badge, shows "Expired on [date]"

## Key Business Rules

1. **No Downgrade to Free Plan**: Users cannot switch from paid plans to Free Plan
2. **Downgrades Allowed**: Users can downgrade to other paid plans (lower value)
3. **No Refunds**: Cancellations do not issue refunds
4. **Continued Access**: Cancelled subscriptions remain active until end date
5. **Upgrade Detection**: Based on total value (price × period multiplier)

## Calculation Examples

### Plan Value Calculation
- Monthly ₹549 = ₹549 × 1 = ₹549 total value
- Quarterly ₹1,499 = ₹1,499 × 1 = ₹1,499 total value (but ₹499.67/month)
- Yearly ₹5,599 = ₹5,599 × 1 = ₹5,599 total value (but ₹466.58/month)

### Upgrade Examples
- Monthly ₹299 → Monthly ₹549 = Upgrade ✓
- Monthly ₹549 → Yearly ₹5,599 = Upgrade ✓
- Yearly ₹5,599 → Monthly ₹999 = Downgrade (₹5,599 > ₹999)
- Quarterly ₹1,499 → Monthly ₹549 = Downgrade (₹1,499 > ₹549)

## Testing Checklist

### Upgrade Detection
- [x] User with no subscription sees "Select Plan"
- [x] User on Free Plan sees "Upgrade" (if paid plans available)
- [x] User on lowest paid plan sees "Upgrade" (if higher plans available)
- [x] User on highest paid plan sees no button
- [x] Plan value calculation works across all billing periods

### Cancellation
- [x] Cancel button only shows for active paid subscriptions
- [x] Cancel button hidden for Free Plan users
- [x] Cancel button hidden for already cancelled subscriptions
- [x] Cancellation dialog shows correct end date
- [x] Cancellation updates database correctly
- [x] User retains access until end date after cancellation
- [x] Status badge updates to "Cancelled"

### Free Plan Exclusion
- [x] Free Plan not shown in plan selection modal
- [x] Existing Free Plan users can still upgrade
- [x] Cannot downgrade from paid plan to Free Plan

### UI/UX
- [x] Status badges display correctly (Active, Cancelled, Expired)
- [x] End dates formatted properly
- [x] Dark mode support for all components
- [x] Success/error messages display appropriately
- [x] Loading states handled correctly

## Files Modified

### Backend
1. `backend/database/migrations/add_subscription_cancellation.sql` (NEW)
2. `backend/src/services/razorpayService.js`
3. `backend/src/models/PartnerSubscription.js`
4. `backend/src/models/Organization.js`
5. `backend/src/controllers/partnerController.js`
6. `backend/src/controllers/organizationController.js`
7. `backend/src/controllers/subscriptionPlanController.js`
8. `backend/src/routes/index.js`

### Frontend
1. `frontend/src/utils/subscriptionHelper.js` (NEW)
2. `frontend/src/components/common/CancellationConfirmDialog.jsx` (NEW)
3. `frontend/src/components/common/SubscriptionStatusBadge.jsx` (NEW)
4. `frontend/src/services/api.js`
5. `frontend/src/components/partner/PartnerSettings.jsx`

## Future Enhancements

1. **Email Notifications**: Send email when subscription is cancelled
2. **Reactivation**: Allow users to reactivate cancelled subscriptions
3. **Prorated Refunds**: Implement partial refunds for early cancellations (if business allows)
4. **Analytics**: Track upgrade/downgrade/cancellation metrics
5. **Organization Bulk Operations**: Apply same logic to organization subscription management
6. **Reminder Emails**: Notify users before subscription expires
7. **Auto-renewal Toggle**: Allow users to turn off auto-renewal without cancelling

## Notes

- The implementation uses Razorpay Subscriptions API for proper recurring billing management
- Cancellations are processed at the end of the billing cycle to ensure continued access
- All database queries are optimized with appropriate indexes
- The UI is fully responsive and supports dark mode
- Error handling is comprehensive with user-friendly messages




