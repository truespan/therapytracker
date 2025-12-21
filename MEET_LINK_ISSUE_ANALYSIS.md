# Meet Link Issue Analysis & Solution

## Problem Statement
No Google Meet link is created when a new video session is created by a therapist.

## Root Cause Identified
**The therapist does not have Google Calendar connected to their account.**

### Diagnostic Results
- ✅ Database schema is correct (`meet_link` column exists)
- ✅ Google Calendar integration is properly implemented
- ❌ **Partner ID 50 has no Google Calendar connection**
- Result: Video sessions are created but cannot generate Meet links

## How Google Meet Integration Works

### Flow Diagram
```
1. Therapist creates video session
   ↓
2. System checks if therapist has Google Calendar connected
   ↓
3. If connected: Create Google Calendar event with conference data
   ↓
4. Google Calendar API generates Meet link
   ↓
5. Meet link is stored in video_sessions.meet_link column
   ↓
6. Users can join the session using the Meet link
```

### Requirements for Meet Link Generation
1. **Google Calendar OAuth Connection**: Therapist must connect their Google Calendar
2. **Valid OAuth Tokens**: Tokens must be valid and not expired
3. **Sync Enabled**: Google Calendar sync must be enabled
4. **Conference Data**: Event must be created with `conferenceDataVersion: 1`

## Solution Implementation

### 1. Backend Changes

#### Add Pre-creation Validation
```javascript
// In videoSessionController.js - createVideoSession function
// Add check before creating session

const tokenRecord = await GoogleCalendarToken.findByUser('partner', partner_id);
if (!tokenRecord || !tokenRecord.sync_enabled) {
  return res.status(400).json({
    error: 'google_calendar_not_connected',
    message: 'Please connect your Google Calendar to create video sessions with Meet links',
    action: 'connect_google_calendar'
  });
}
```

#### Enhanced Error Messages
```javascript
// In googleCalendarService.js - syncVideoSessionToGoogle function
// Improve error handling and user feedback

if (!tokenRecord || !tokenRecord.sync_enabled) {
  await updateVideoSessionSyncStatus(sessionId, 'not_synced', null, 'Google Calendar not connected');
  return { 
    success: false, 
    reason: 'not_connected',
    message: 'Google Calendar not connected. Please connect your Google Calendar to generate Meet links.'
  };
}
```

### 2. Frontend Changes

#### Video Session Creation Form
```javascript
// In CreateSessionModal.jsx or similar component
// Add Google Calendar connection check

const checkGoogleCalendarConnection = async () => {
  try {
    const response = await api.get('/google-calendar/status');
    if (!response.data.connected) {
      setShowGoogleCalendarWarning(true);
      setGoogleCalendarConnectUrl(response.data.authUrl);
    }
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
  }
};
```

#### User-Friendly Error Messages
```javascript
// Display helpful error messages to guide users

if (error.response?.data?.error === 'google_calendar_not_connected') {
  showNotification({
    type: 'warning',
    title: 'Google Calendar Required',
    message: 'Please connect your Google Calendar to create video sessions with Meet links.',
    action: {
      label: 'Connect Google Calendar',
      onClick: () => window.open(error.response.data.authUrl, '_blank')
    }
  });
}
```

### 3. User Experience Improvements

#### Pre-Session Creation Checklist
- [ ] Check if therapist has Google Calendar connected
- [ ] If not connected, show clear instructions
- [ ] Provide direct link to Google Calendar connection page
- [ ] Explain why Google Calendar is needed

#### Connection Instructions for Therapists
1. Go to Settings > Calendar Integration
2. Click "Connect Google Calendar"
3. Authorize TheraP Track to access your Google Calendar
4. Return to create video sessions with automatic Meet links

## Testing Checklist

### Before Fix
- [ ] Create video session without Google Calendar connected
- [ ] Verify no Meet link is generated
- [ ] Verify session is created but sync status is "not_synced"

### After Fix
- [ ] Try to create video session without Google Calendar connected
- [ ] Verify error message appears with clear instructions
- [ ] Connect Google Calendar
- [ ] Create video session successfully
- [ ] Verify Meet link is generated and stored
- [ ] Verify Google Calendar event is created with Meet link

## Rollback Plan
If issues occur:
1. Revert the pre-creation validation check
2. Allow sessions to be created without Meet links
3. Display warning instead of blocking creation

## Monitoring
- Track Google Calendar connection rates
- Monitor video session creation success rates
- Log Google Calendar sync errors
- Alert on expired OAuth tokens

## Documentation Updates Needed
1. Update user documentation with Google Calendar requirement
2. Add troubleshooting guide for Meet link issues
3. Create video tutorial for connecting Google Calendar
4. Update FAQ with common questions

## Related Files
- [`backend/src/controllers/videoSessionController.js`](backend/src/controllers/videoSessionController.js:4)
- [`backend/src/services/googleCalendarService.js`](backend/src/services/googleCalendarService.js:333)
- [`backend/src/models/GoogleCalendarToken.js`](backend/src/models/GoogleCalendarToken.js)
- [`frontend/src/components/sessions/CreateSessionModal.jsx`](frontend/src/components/sessions/CreateSessionModal.jsx)
- [`frontend/src/components/video/VideoSessionsTab.jsx`](frontend/src/components/video/VideoSessionsTab.jsx)

## Support Information
If therapists continue to experience issues:
1. Run diagnostic script: `node backend/diagnose-meet-link-issue.js`
2. Check Google Calendar token status in database
3. Verify OAuth credentials are valid
4. Check Google Calendar API quotas

---
**Issue Identified**: December 21, 2025
**Status**: Root cause identified, solution in progress
**Priority**: High - Affects core video session functionality