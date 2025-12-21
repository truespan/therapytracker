# Therapist Video Session Management Feature

## Overview

This feature extends the existing video session functionality to allow organizations with `theraptrack_controlled=true` to enable or disable video sessions for individual therapists, providing granular control over video session access.

## Implementation Summary

### Database Changes

**File:** `backend/database/migration_add_therapist_video_sessions.sql`

Added `video_sessions_enabled` column to the `partners` table:
```sql
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS video_sessions_enabled BOOLEAN DEFAULT true;
```

### Backend Changes

#### 1. Partner Model Updates
**File:** `backend/src/models/Partner.js`

- Updated `create()` method to include `video_sessions_enabled` parameter
- Updated `update()` method to handle `video_sessions_enabled` field
- Added `areVideoSessionsEnabled(partnerId)` - Check if video sessions are enabled for a specific partner
- Added `getAllWithVideoSettings(organizationId)` - Get all therapists with their video session settings and usage statistics
- Added `updateVideoSessionSetting(partnerId, enabled)` - Update video session setting for a specific therapist

#### 2. Video Session Access Middleware
**File:** `backend/src/middleware/videoSessionAccess.js`

Enhanced the middleware to check both organization-level AND therapist-level settings:

```javascript
const checkVideoSessionsEnabled = async (partnerId) => {
  const orgEnabled = await Organization.areVideoSessionsEnabledForPartner(partnerId);
  const partnerEnabled = await Partner.areVideoSessionsEnabled(partnerId);
  const isEnabled = orgEnabled && partnerEnabled;
  
  // Returns detailed reason for disabled access
  return {
    isEnabled,
    reason: !orgEnabled ? 'organization_disabled' : !partnerEnabled ? 'therapist_disabled' : 'enabled',
    message: 'Appropriate message based on reason'
  };
};
```

#### 3. Organization Controller
**File:** `backend/src/controllers/organizationController.js`

Added three new endpoints:

- `GET /organizations/:id/therapists/video-settings` - Get all therapists with video session settings
- `PUT /organizations/:id/therapists/:therapistId/video-settings` - Update individual therapist setting
- `PUT /organizations/:id/therapists/video-settings/bulk` - Bulk update multiple therapists

#### 4. API Routes
**File:** `backend/src/routes/index.js`

Added new routes:
```javascript
router.get('/organizations/:id/therapists/video-settings', authenticateToken, checkRole('organization'), organizationController.getTherapistsVideoSettings);
router.put('/organizations/:id/therapists/:therapistId/video-settings', authenticateToken, checkRole('organization'), organizationController.updateTherapistVideoSettings);
router.put('/organizations/:id/therapists/video-settings/bulk', authenticateToken, checkRole('organization'), organizationController.bulkUpdateTherapistVideoSettings);
```

### Frontend Changes

#### 1. API Services
**File:** `frontend/src/services/api.js`

Added new API methods:
```javascript
getTherapistsVideoSettings: (organizationId) => api.get(`/organizations/${organizationId}/therapists/video-settings`),
updateTherapistVideoSettings: (organizationId, therapistId, video_sessions_enabled) => 
  api.put(`/organizations/${organizationId}/therapists/${therapistId}/video-settings`, { video_sessions_enabled }),
bulkUpdateTherapistVideoSettings: (organizationId, therapistIds, video_sessions_enabled) => 
  api.put(`/organizations/${organizationId}/therapists/video-settings/bulk`, { therapistIds, video_sessions_enabled }),
```

#### 2. Therapist Video Settings Component
**File:** `frontend/src/components/organization/TherapistVideoSettings.jsx`

New component that provides:
- List of all therapists in the organization
- Individual toggle switches for video session access
- Bulk actions (enable all, disable all)
- Search/filter functionality
- Real-time statistics (enabled/disabled counts)
- Usage statistics per therapist (client count, session count)

#### 3. Organization Settings Integration
**File:** `frontend/src/components/organization/OrganizationSettings.jsx`

- Added "Therapist Video Session Management" section
- Only visible for theraptrack-controlled organizations
- Integrated the new TherapistVideoSettings component

#### 4. Video Sessions Tab Updates
**File:** `frontend/src/components/video/VideoSessionsTab.jsx`

- Enhanced error handling to show specific messages for therapist-disabled access
- Maintains existing functionality while respecting new access controls

## Access Control Logic

### Decision Matrix

| Organization Level | Therapist Level | Result | Reason |
|-------------------|-----------------|--------|--------|
| Enabled | Enabled | ✅ Allowed | Both enabled |
| Enabled | Disabled | ❌ Blocked | Therapist disabled |
| Disabled | Enabled | ❌ Blocked | Organization disabled |
| Disabled | Disabled | ❌ Blocked | Organization disabled |

### Special Cases

- **Non-theraptrack organizations**: Only organization-level setting matters
- **Theraptrack-controlled organizations**: Both organization AND therapist must have video sessions enabled

## User Experience

### For Organization Administrators

1. Navigate to Organization Settings
2. See "Therapist Video Session Management" section (only for theraptrack-controlled orgs)
3. View all therapists with their current video session status
4. Toggle individual therapists on/off
5. Use bulk actions to enable/disable all therapists
6. See real-time statistics and usage data

### For Therapists

- If video sessions are disabled for them:
  - See clear error message: "Video sessions are not enabled for your account. Please contact your organization administrator."
  - Cannot create, edit, or manage video sessions
  - Can still view existing sessions (read-only)

### For Clients

- No direct impact - clients can join sessions if the therapist has access
- Join links work normally when sessions are properly configured

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] New column has correct default value (true)
- [ ] Index is created for performance

### Backend API
- [ ] Organization can fetch therapist video settings
- [ ] Organization can update individual therapist setting
- [ ] Organization can bulk update multiple therapists
- [ ] Video session access respects therapist-level settings
- [ ] Proper error messages for disabled access
- [ ] Non-theraptrack organizations work as before

### Frontend
- [ ] TherapistVideoSettings component loads correctly
- [ ] Toggle switches work and update backend
- [ ] Bulk actions work correctly
- [ ] Search/filter functionality works
- [ ] Statistics update in real-time
- [ ] Error messages display appropriately
- [ ] Component only shows for theraptrack-controlled orgs

### Integration
- [ ] Video session creation blocked when therapist disabled
- [ ] Video session editing blocked when therapist disabled
- [ ] Video session deletion blocked when therapist disabled
- [ ] Existing sessions remain accessible (read-only)
- [ ] Organization-level disable overrides therapist-level enable

## Security Considerations

1. **Authorization**: All endpoints check that the requesting organization owns the therapists
2. **Role-based access**: Only organization users can manage therapist settings
3. **Theraptrack check**: Feature only available for theraptrack-controlled organizations
4. **Default values**: New therapists get video_sessions_enabled=true by default
5. **Audit trail**: All changes are logged in the database

## Performance Considerations

1. **Database index**: Created index on `video_sessions_enabled` column for faster queries
2. **Efficient queries**: Single query fetches all therapists with usage statistics
3. **Bulk operations**: Bulk update endpoint for mass changes
4. **Caching**: Frontend caches therapist list to reduce API calls

## Future Enhancements

1. **Audit log**: Track who enabled/disabled video sessions for each therapist
2. **Email notifications**: Notify therapists when their video session access changes
3. **Scheduled changes**: Allow scheduling enable/disable at specific times
4. **Usage analytics**: Detailed reports on video session usage per therapist
5. **API rate limiting**: Prevent abuse of bulk update endpoints

## Deployment Instructions

1. **Run database migration**:
   ```bash
   cd backend
   psql -d your_database -f database/migration_add_therapist_video_sessions.sql
   ```

2. **Deploy backend changes**:
   - All backend files are ready to deploy
   - No breaking changes to existing API

3. **Deploy frontend changes**:
   - New component: TherapistVideoSettings.jsx
   - Updated files: OrganizationSettings.jsx, VideoSessionsTab.jsx, api.js
   - Build and deploy as usual

4. **Verify deployment**:
   - Check that migration applied successfully
   - Test with a theraptrack-controlled organization
   - Verify non-theraptrack organizations unaffected

## Troubleshooting

### Issue: Therapists still have access after being disabled
- **Check**: Verify the `video_sessions_enabled` column was updated in database
- **Check**: Clear any cached session data
- **Check**: Ensure middleware is properly applied to routes

### Issue: Organization settings not showing therapist management
- **Check**: Verify organization has `theraptrack_controlled=true`
- **Check**: Ensure organization has `video_sessions_enabled=true`
- **Check**: Verify user has 'organization' role

### Issue: API returns 403 Forbidden
- **Check**: Verify organization ID matches in request
- **Check**: Ensure user is authenticated with proper role
- **Check**: Confirm organization is theraptrack-controlled

## Support

For technical support or questions about this feature:
1. Check the troubleshooting section above
2. Review API documentation in the code comments
3. Check database schema and migrations
4. Review middleware logic for access control