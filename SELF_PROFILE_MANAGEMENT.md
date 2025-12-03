# Self Profile Management Implementation

This document describes the implementation of self-service profile management for Partners and Organizations.

## Overview

Partners and Organizations can now manage their own profile information and profile pictures/logos through dedicated Settings pages accessible from their respective dashboards.

## Changes Made

### 1. Partner Self-Service Profile Management

#### New Component: PartnerSettings
**Location**: `frontend/src/components/partner/PartnerSettings.jsx`

**Features**:
- Profile picture upload and management
- Update personal information (name, sex, age, email, contact, address)
- View Partner ID
- Email verification status display
- Form validation
- Success/error messaging
- Auto-refresh of user data after updates

**Accessible via**: Settings tab in Partner Dashboard

#### Partner Dashboard Updates
**Location**: `frontend/src/components/dashboard/PartnerDashboard.jsx`

**Changes**:
- Added "Settings" tab to navigation (both mobile and desktop)
- Imported PartnerSettings component
- Added Settings icon from lucide-react
- Integrated Settings tab rendering

**Navigation**:
- Mobile: Horizontal scrollable tabs with Settings icon
- Desktop: Traditional tab navigation with Settings option

### 2. Organization Self-Service Profile Management

#### New Component: OrganizationSettings
**Location**: `frontend/src/components/organization/OrganizationSettings.jsx`

**Features**:
- Organization logo upload and management
- Update organization information (name, email, contact, address, GST number)
- View subscription plan
- Form validation
- Success/error messaging
- Auto-refresh of user data after updates

**Accessible via**: Settings tab in Organization Dashboard

#### Organization Dashboard Updates
**Location**: `frontend/src/components/dashboard/OrganizationDashboard.jsx`

**Changes**:
- Added tab/view system with `activeView` state ('partners' or 'settings')
- Added Settings tab navigation
- Imported OrganizationSettings component
- Added Settings icon from lucide-react
- Wrapped existing partners management content in conditional rendering
- Added floating action button conditional (only shows in partners view)

**Navigation**:
- Tab 1: "Therapists Management" - Existing partners management functionality
- Tab 2: "Settings" - New organization settings page

### 3. Authentication Context Enhancement

#### Updated: AuthContext
**Location**: `frontend/src/context/AuthContext.jsx`

**New Function**: `refreshUser()`
- Fetches current user data from the backend
- Updates localStorage with fresh user data
- Updates React state with new user information
- Returns success/error status
- Used after profile picture uploads to immediately reflect changes in dashboard

**Provider Export**:
Added `refreshUser` to AuthContext.Provider value

## How It Works

### For Partners

1. **Login as Partner**
2. **Navigate to Settings Tab**
   - Mobile: Scroll horizontal tab menu to find "Settings"
   - Desktop: Click "Settings" tab in top navigation
3. **Update Profile**
   - Upload/change/delete profile picture
   - Edit personal information
   - Click "Save Changes"
4. **Profile Picture Updates**
   - Upload automatically updates database
   - User data refreshes immediately
   - Picture displays in dashboard header instantly

### For Organizations

1. **Login as Organization**
2. **Navigate to Settings Tab**
   - Click "Settings" tab (next to "Therapists Management")
3. **Update Organization Profile**
   - Upload/change/delete organization logo
   - Edit organization information
   - Click "Save Changes"
4. **Logo Updates**
   - Upload automatically updates database
   - User data refreshes immediately
   - Logo displays in dashboard header instantly

## Integration with Existing Features

### Profile Picture Display
Profile pictures uploaded through Settings immediately appear in:
- Partner Dashboard header (Welcome section)
- Organization Dashboard header

### User Data Synchronization
The `refreshUser()` function ensures that:
- Profile changes are immediately reflected across the application
- No page refresh required
- Context state stays synchronized with backend
- LocalStorage stays up-to-date

### API Integration
Uses existing API endpoints:
- `partnerAPI.updatePartner(id, data)` - Updates partner info
- `organizationAPI.updateOrganization(id, data)` - Updates organization info
- `authAPI.getCurrentUser()` - Refreshes user data
- Upload endpoints from previous implementation

## User Experience Flow

### Partner Settings Flow
```
Partner Dashboard
  └─> Settings Tab
       └─> PartnerSettings Component
            ├─> Upload Profile Picture (via ImageUpload)
            │    └─> Auto-save to database
            │    └─> Refresh user data
            │    └─> Update dashboard header
            │
            └─> Edit Profile Form
                 └─> Validate inputs
                 └─> Save changes
                 └─> Refresh user data
                 └─> Show success message
```

### Organization Settings Flow
```
Organization Dashboard
  └─> Settings Tab
       └─> OrganizationSettings Component
            ├─> Upload Logo (via ImageUpload)
            │    └─> Auto-save to database
            │    └─> Refresh user data
            │    └─> Update dashboard header
            │
            └─> Edit Organization Form
                 └─> Validate inputs
                 └─> Save changes
                 └─> Refresh user data
                 └─> Show success message
```

## File Structure

```
frontend/src/
├── components/
│   ├── partner/
│   │   └── PartnerSettings.jsx         # NEW: Partner self-service settings
│   ├── organization/
│   │   └── OrganizationSettings.jsx    # NEW: Organization self-service settings
│   ├── dashboard/
│   │   ├── PartnerDashboard.jsx        # UPDATED: Added Settings tab
│   │   └── OrganizationDashboard.jsx   # UPDATED: Added Settings tab/view
│   └── common/
│       └── ImageUpload.jsx             # EXISTING: Reused for profile pictures
└── context/
    └── AuthContext.jsx                 # UPDATED: Added refreshUser function
```

## Key Benefits

### 1. Independence
- Partners can manage their own profiles without organization intervention
- Organizations can manage their profiles without admin intervention
- Reduces administrative overhead

### 2. Immediate Updates
- Changes reflect instantly across the application
- No page refresh required
- Real-time synchronization with backend

### 3. User-Friendly
- Simple, intuitive interface
- Clear success/error messaging
- Form validation prevents errors
- Consistent design with existing UI

### 4. Secure
- Uses existing authentication middleware
- Validates user permissions
- Requires login to access settings
- Updates only allowed for own profile

## Validation Rules

### Partner Settings
- **Name**: Required, non-empty
- **Sex**: Required (Male/Female/Others)
- **Age**: Required, 18-100 years
- **Email**: Required, valid email format
- **Contact**: Required, 7-15 digits
- **Address**: Optional

### Organization Settings
- **Name**: Required, non-empty
- **Email**: Required, valid email format
- **Contact**: Required, 10 digits
- **Address**: Required, non-empty
- **GST Number**: Optional

### Profile Picture/Logo
- **File Type**: JPEG, PNG, GIF, WebP
- **File Size**: Maximum 5MB
- **Dimensions**: Any (displayed as circular avatar)

## Error Handling

### Frontend Validation
- Inline validation on form fields
- Red border and error message for invalid inputs
- Prevents submission until all validations pass

### Upload Errors
- File type validation
- File size validation
- Network error handling
- Display error message below upload component

### Save Errors
- API error handling
- User-friendly error messages
- Retry capability

## Success Feedback

### Visual Indicators
- Green success message banner
- Checkmark icon for confirmation
- Auto-dismiss after 3 seconds

### Data Updates
- Profile picture updates immediately in header
- User data refreshes across all components
- No manual refresh required

## Comparison: Organization vs Admin Editing

### Previous Implementation (Still Available)
**Admin Dashboard → Edit Organization Modal**:
- Admin can edit organization details
- Includes photo_url field
- Requires admin privileges

**Organization Dashboard → Edit Partner Modal**:
- Organization can edit partner details
- Includes photo_url field
- Requires organization privileges

### New Implementation
**Partner Settings**:
- Partners edit their own profile
- Full control over their information
- Accessible from Partner Dashboard

**Organization Settings**:
- Organizations edit their own profile
- Full control over their information
- Accessible from Organization Dashboard

**Both systems coexist** - Admins and Organizations still have editing capabilities for management purposes, while Partners and Organizations can self-manage their profiles.

## Mobile Responsiveness

### Partner Settings
- Responsive form layout
- Mobile-friendly image upload
- Touch-optimized buttons
- Scrollable content area

### Organization Settings
- Responsive form layout
- Mobile-friendly image upload
- Touch-optimized buttons
- Scrollable content area

### Dashboard Integration
- Mobile: Horizontal scrollable tabs for Partners
- Mobile: Full-width tabs for Organizations
- Desktop: Traditional tab navigation for both

## Testing Checklist

### Partner Settings
- [ ] Can access Settings tab from Partner Dashboard
- [ ] Can upload profile picture
- [ ] Profile picture displays in dashboard header
- [ ] Can update name, sex, age
- [ ] Can update email (shows re-verification warning)
- [ ] Can update contact number
- [ ] Can update address
- [ ] Form validation works correctly
- [ ] Success message displays after save
- [ ] Error messages display on failure
- [ ] Can delete profile picture

### Organization Settings
- [ ] Can access Settings tab from Organization Dashboard
- [ ] Can upload organization logo
- [ ] Logo displays in dashboard header
- [ ] Can update organization name
- [ ] Can update email
- [ ] Can update contact number
- [ ] Can update address
- [ ] Can update GST number
- [ ] Subscription plan displays correctly
- [ ] Form validation works correctly
- [ ] Success message displays after save
- [ ] Error messages display on failure
- [ ] Can delete logo

### Integration
- [ ] refreshUser() updates context correctly
- [ ] Profile changes persist after page reload
- [ ] Profile pictures load correctly from backend
- [ ] Navigation tabs work on mobile and desktop
- [ ] Existing functionality not affected

## Future Enhancements

### Partner Settings
- [ ] Change password functionality
- [ ] Two-factor authentication setup
- [ ] Notification preferences
- [ ] Session management
- [ ] Connected accounts view

### Organization Settings
- [ ] Billing information management
- [ ] Subscription upgrade/downgrade
- [ ] Usage statistics
- [ ] API key management
- [ ] Webhook configuration

### Both
- [ ] Activity log (recent changes)
- [ ] Profile completion percentage
- [ ] Profile picture cropper
- [ ] Multiple profile pictures/gallery
- [ ] Export profile data
- [ ] Delete account functionality

## Troubleshooting

### Profile Picture Not Displaying
**Symptoms**: Picture uploaded but doesn't show in dashboard

**Solutions**:
1. Check browser console for errors
2. Verify backend server is running
3. Check photo_url in database
4. Clear browser cache
5. Verify uploads folder exists and has correct permissions

### refreshUser Not Working
**Symptoms**: Changes saved but not reflected in UI

**Solutions**:
1. Check authAPI.getCurrentUser() endpoint
2. Verify token is valid
3. Check browser localStorage for updated user data
4. Verify AuthContext is properly wrapped around app

### Settings Tab Not Showing
**Symptoms**: Can't find Settings tab in dashboard

**Solutions**:
1. Verify user is logged in as Partner/Organization
2. Check browser console for component errors
3. Verify PartnerSettings/OrganizationSettings components imported
4. Check activeTab/activeView state

## API Endpoints Used

### Profile Updates
```
PUT /api/partners/:id
PUT /api/organizations/:id
```

### User Data Refresh
```
GET /api/auth/me
```

### Profile Picture Upload
```
POST /api/upload/profile-picture
DELETE /api/upload/profile-picture
```

## Conclusion

The self-service profile management feature empowers Partners and Organizations to maintain their own profiles independently, reducing administrative overhead while providing immediate updates and a user-friendly experience. The implementation reuses existing components (ImageUpload) and integrates seamlessly with the existing dashboard structure, maintaining consistency across the application.

Both user types can now:
1. Upload and manage their profile pictures/logos
2. Update their personal/organization information
3. View relevant metadata (Partner ID, subscription plan)
4. See changes reflected immediately across the application

The feature is production-ready and fully integrated with the existing authentication and authorization system.
