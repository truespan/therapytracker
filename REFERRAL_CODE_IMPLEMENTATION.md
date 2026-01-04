# Referral Code System Implementation

## Overview
Successfully implemented a referral code system that allows admins to set referral codes with optional discounts for TheraPTrack-controlled organizations. Therapists can use these codes during signup to automatically join the organization and receive any associated discounts.

## Features Implemented

### 1. Database Schema
- **Organizations Table**: Added `referral_code`, `referral_code_discount`, and `referral_code_discount_type` columns
- **Partners Table**: Added `referral_code_used`, `referral_discount_applied`, and `referral_discount_type` columns for tracking
- **Constraints**: 
  - Referral codes are unique across all organizations
  - Discount validation (>= 0, percentage <= 100)
  - Referral codes only available for `theraptrack_controlled = true` organizations

### 2. Backend Implementation

#### Models (`backend/src/models/Organization.js`)
- Updated `create()` method to handle referral code fields with validation
- Updated `update()` method to validate and update referral codes
- Added `findByReferralCode(code)` method for case-insensitive lookup
- Validation ensures referral codes can only be set for TheraPTrack-controlled orgs

#### Models (`backend/src/models/Partner.js`)
- Updated `create()` method to store referral code tracking information
- Partners now track which referral code was used and what discount was applied

#### Controllers (`backend/src/controllers/adminController.js`)
- `createOrganization()`: Accepts and validates referral code fields
- `updateOrganization()`: Handles referral code updates with uniqueness checks
- Validates discount amounts and types

#### Controllers (`backend/src/controllers/authController.js`)
- `therapistSignup()`: Now accepts both `token` and `referral_code` parameters
- Looks up organization by referral code if provided
- Stores referral code and discount information in partner record
- Applies discount to therapist's subscription

#### Controllers (`backend/src/controllers/organizationController.js`)
- Added `verifyReferralCode()` public endpoint
- Returns organization info and discount details for valid codes

#### Routes (`backend/src/routes/index.js`)
- Added `GET /api/organizations/verify-referral-code/:code` public endpoint

### 3. Frontend Implementation

#### API Service (`frontend/src/services/api.js`)
- Added `verifyReferralCode(code)` method for public verification

#### Admin UI - Create Organization (`frontend/src/components/admin/CreateOrganizationModal.jsx`)
- Referral code section only shown when `theraptrack_controlled` is checked
- Discount amount and type fields
- Real-time discount preview (e.g., "20% off" or "₹500 off")
- Validates and submits referral code data

#### Admin UI - Edit Organization (`frontend/src/components/admin/EditOrganizationModal.jsx`)
- Shows current referral code if set
- Allows updating/clearing referral codes
- Warning when changing existing referral code
- Discount fields with preview

#### Therapist Signup (`frontend/src/pages/TherapistSignup.jsx`)
- Supports both token-based and referral code-based signup
- Real-time referral code verification with debounce
- Shows organization name when code is verified
- Displays discount information prominently
- Visual feedback (green for valid, red for invalid)

## Data Flow

```
Admin creates/updates organization
  ↓
Sets referral code + optional discount
  ↓
Therapist enters referral code during signup
  ↓
System verifies code (case-insensitive)
  ↓
Shows organization name + discount info
  ↓
Therapist completes signup
  ↓
Partner record stores: referral_code_used, discount_applied, discount_type
  ↓
Discount applied to subscription
```

## Validation Rules

1. ✅ Referral codes must be unique across all organizations
2. ✅ Referral codes only for `theraptrack_controlled = true` organizations
3. ✅ Referral codes stored as UPPERCASE for consistency
4. ✅ Case-insensitive lookups
5. ✅ Discount amount >= 0
6. ✅ Percentage discount <= 100
7. ✅ Discount type must be 'percentage' or 'fixed'
8. ✅ Discount is optional (can have code without discount)

## Database Migrations

### Migration 1: `add_referral_code_to_organizations.sql`
```sql
ALTER TABLE organizations 
ADD COLUMN referral_code VARCHAR(50) UNIQUE,
ADD COLUMN referral_code_discount DECIMAL(10,2),
ADD COLUMN referral_code_discount_type VARCHAR(20);

-- Constraints for validation
-- Index for fast lookups
```

### Migration 2: `add_referral_tracking_to_partners.sql`
```sql
ALTER TABLE partners 
ADD COLUMN referral_code_used VARCHAR(50),
ADD COLUMN referral_discount_applied DECIMAL(10,2),
ADD COLUMN referral_discount_type VARCHAR(20);

-- Index for analytics
```

## Usage Examples

### Admin: Create Organization with Referral Code
1. Check "TheraPTrack Controlled"
2. Enter referral code (e.g., "WELCOME2024")
3. Optionally set discount (e.g., 20% or ₹500)
4. Save organization

### Therapist: Sign Up with Referral Code
1. Go to signup page (with or without token)
2. Enter referral code
3. System verifies and shows organization name + discount
4. Complete registration
5. Discount automatically applied to subscription

## API Endpoints

### Public Endpoints
- `GET /api/organizations/verify-referral-code/:code` - Verify referral code
  - Returns: `{ valid, organization_name, discount: { amount, type, display } }`

### Protected Endpoints
- `POST /api/admin/organizations` - Create organization (with referral code)
- `PUT /api/admin/organizations/:id` - Update organization (with referral code)
- `POST /api/auth/therapist-signup` - Therapist signup (accepts `referral_code`)

## Testing Checklist

- [x] Admin can set referral code for TheraPTrack-controlled organization
- [x] Admin can set referral code with percentage discount
- [x] Admin can set referral code with fixed discount
- [x] Admin can set referral code without discount
- [x] Admin cannot set referral code for non-controlled organization
- [x] Referral codes are unique (duplicate check)
- [x] Referral code lookup is case-insensitive
- [x] Therapist can sign up using valid referral code
- [x] Therapist sees organization name when code is verified
- [x] Therapist sees discount information during signup
- [x] Invalid referral code shows error
- [x] Referral code and discount stored in partner record
- [x] Discount validation (percentage 0-100, fixed >= 0)

## Files Modified

### Backend
- `backend/database/migrations/add_referral_code_to_organizations.sql` (new)
- `backend/database/migrations/add_referral_tracking_to_partners.sql` (new)
- `backend/src/models/Organization.js`
- `backend/src/models/Partner.js`
- `backend/src/controllers/adminController.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/organizationController.js`
- `backend/src/routes/index.js`

### Frontend
- `frontend/src/services/api.js`
- `frontend/src/components/admin/CreateOrganizationModal.jsx`
- `frontend/src/components/admin/EditOrganizationModal.jsx`
- `frontend/src/pages/TherapistSignup.jsx`

## Notes

- Referral codes are stored in UPPERCASE for consistency
- Lookups are case-insensitive for better UX
- Discount information is tracked in partner records for analytics
- System supports both token-based and referral code-based signup
- TherapistSignupModal continues to work with token-based flow
- Referral code can be entered directly on signup page without token

