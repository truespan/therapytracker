# Subscription Management Implementation Plan for Non-TheraPTrack Controlled Organizations

## Overview
This plan outlines the implementation of subscription plan selection functionality for organizations with `theraptrack_controlled` set to "false". The implementation will allow these organizations to:
1. Select a subscription plan and apply it to all partners at once
2. Set different subscription plans for each partner individually
3. Use a "Select Plan" button similar to TheraPTrack controlled organizations
4. Open a modal showing available subscription plans in boxes side by side

## Current State Analysis

### Backend Architecture
- **PartnerSubscriptionController**: Currently restricted to `theraptrack_controlled=true` organizations
- **SubscriptionPlanController**: Provides plan management and selection endpoints
- **Routes**: Organization subscription routes exist but are limited
- **Models**: Organization, Partner, SubscriptionPlan, PartnerSubscription models are in place

### Frontend Architecture
- **OrganizationDashboard**: Main dashboard with tabs for partners, settings, questionnaires
- **OrganizationSettings**: Contains subscription management for non-controlled orgs (basic dropdown)
- **SubscriptionManagement**: Currently only for `theraptrack_controlled=true` orgs
- **PlanSelectionModal**: Reusable modal component for plan selection

## Implementation Requirements

### 1. Backend Changes

#### 1.1 Update PartnerSubscriptionController
**File**: `backend/src/controllers/partnerSubscriptionController.js`

Remove the `theraptrack_controlled` restriction from all endpoints:
- `getOrganizationPartnerSubscriptions`
- `assignSubscriptions`
- `updateSubscription`
- `removeSubscriptions`

#### 1.2 Add Bulk Assignment Endpoint
**File**: `backend/src/controllers/partnerSubscriptionController.js`

Add new endpoint `assignToAllPartners`:
```javascript
const assignToAllPartners = async (req, res) => {
  // Accept subscription_plan_id and billing_period
  // Get all partners for the organization
  // Assign the plan to all partners in a transaction
  // Return success message with count
};
```

#### 1.3 Update Routes
**File**: `backend/src/routes/index.js`

Add new route:
```javascript
router.post('/organizations/:id/partner-subscriptions/assign-all', 
  authenticateToken, 
  checkRole('organization'), 
  partnerSubscriptionController.assignToAllPartners
);
```

### 2. Frontend Changes

#### 2.1 Create NonControlledSubscriptionManagement Component
**File**: `frontend/src/components/organization/NonControlledSubscriptionManagement.jsx`

New component for non-theraptrack_controlled organizations with:
- "Apply to All Partners" button
- Individual partner plan assignment
- Plan selection modal integration
- Bulk operations support

#### 2.2 Update OrganizationSettings Component
**File**: `frontend/src/components/organization/OrganizationSettings.jsx`

Replace basic subscription dropdown with:
- "Select Plan" button that opens PlanSelectionModal
- Options for "Apply to All Partners" vs "Individual Assignment"
- Integration with new NonControlledSubscriptionManagement component

#### 2.3 Enhance PlanSelectionModal
**File**: `frontend/src/components/common/PlanSelectionModal.jsx`

Add support for:
- Organization context (pass organizationId)
- Bulk operation mode
- Confirmation dialog for bulk assignments

#### 2.4 Update API Services
**File**: `frontend/src/services/api.js`

Add new API methods:
- `assignPartnerSubscriptionsToAll(organizationId, data)`
- Update existing methods to remove theraptrack_controlled restrictions

### 3. Database Schema
No changes required - existing schema supports the functionality

### 4. User Flow Design

#### 4.1 For Organization Admin (non-theraptrack_controlled):
1. Navigate to Settings tab
2. See "Select Plan" button in Subscription Management section
3. Click button opens PlanSelectionModal
4. Modal shows available plans in grid layout
5. Select plan and billing period
6. Choose: "Apply to All Partners" or "Assign Individually"
7. If "Apply to All": Confirm bulk assignment
8. If "Assign Individually": Navigate to partner list for individual assignment

#### 4.2 For Individual Partner Assignment:
1. In SubscriptionManagement component
2. See list of all partners
3. Each partner has "Select Plan" button
4. Click opens PlanSelectionModal
5. Select plan and confirm
6. Plan assigned to specific partner only

## Implementation Steps

### Phase 1: Backend Updates
1. Remove theraptrack_controlled restrictions from PartnerSubscriptionController
2. Add assignToAllPartners endpoint
3. Update routes in index.js
4. Test endpoints with Postman

### Phase 2: Frontend - Core Components
1. Create NonControlledSubscriptionManagement component
2. Enhance PlanSelectionModal with bulk operation support
3. Update API services
4. Test component integration

### Phase 3: Frontend - Integration
1. Update OrganizationSettings to use new components
2. Add "Select Plan" button with modal trigger
3. Implement bulk assignment workflow
4. Test complete user flow

### Phase 4: Testing & Refinement
1. Test all scenarios:
   - Apply plan to all partners
   - Assign different plans to individual partners
   - Remove subscriptions
   - Update existing subscriptions
2. Handle edge cases and error scenarios
3. Performance testing for bulk operations

## Technical Considerations

### Security
- Maintain existing authentication and authorization
- Ensure organizations can only manage their own partners
- Validate subscription plan compatibility with organization size

### Performance
- Use database transactions for bulk operations
- Implement proper loading states
- Consider pagination for large partner lists

### User Experience
- Clear visual feedback for bulk operations
- Confirmation dialogs for destructive actions
- Consistent UI with existing subscription management
- Mobile-responsive design

## Files to Create/Modify

### Backend Files:
- `backend/src/controllers/partnerSubscriptionController.js` (modify)
- `backend/src/routes/index.js` (modify)

### Frontend Files:
- `frontend/src/components/organization/NonControlledSubscriptionManagement.jsx` (new)
- `frontend/src/components/organization/OrganizationSettings.jsx` (modify)
- `frontend/src/components/common/PlanSelectionModal.jsx` (modify)
- `frontend/src/services/api.js` (modify)

### Documentation:
- Update API documentation
- Add user guide for new subscription management features

## Success Criteria
1. Non-theraptrack_controlled organizations can access subscription management
2. "Select Plan" button visible and functional in Settings tab
3. Plan selection modal displays available plans in grid layout
4. Bulk assignment to all partners works correctly
5. Individual partner assignment works correctly
6. All existing functionality remains intact for theraptrack_controlled organizations
7. No security vulnerabilities introduced
8. Performance acceptable for organizations with many partners

## Next Steps
1. Review and approve this plan
2. Switch to Code mode for implementation
3. Implement backend changes first
4. Implement frontend changes
5. Test thoroughly
6. Deploy to staging environment
7. User acceptance testing
8. Production deployment