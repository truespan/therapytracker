# Google Meet Integration Guide

This guide explains how to migrate from Daily.co/Jitsi to Google Meet for video sessions in TheraP Track.

## Overview

The integration leverages your existing Google Calendar OAuth to automatically create Google Meet links when video sessions are scheduled. Users are redirected to Google Meet in a new tab instead of using embedded video.

## Architecture Changes

### Before (Daily.co/Jitsi)
```
Video Session Creation → Daily.co API → Store daily_room_url → Google Calendar Sync with Jitsi link
```

### After (Google Meet)
```
Video Session Creation → Google Calendar API with conference data → Store meet_link → Event contains Meet link
```

## Implementation Summary

### Backend Changes

1. **Database Schema Update**
   - Added `meet_link` column to `video_sessions` table
   - Removed `daily_room_url` column
   - Migration script: [`backend/migrations/20241221_add_meet_link_to_video_sessions.sql`](backend/migrations/20241221_add_meet_link_to_video_sessions.sql)

2. **Model Updates**
   - [`VideoSession.js`](backend/src/models/VideoSession.js): Updated to use `meet_link` instead of `daily_room_url`

3. **Service Updates**
   - [`googleCalendarService.js`](backend/src/services/googleCalendarService.js): Added conference data to create Google Meet links
   - Removed [`dailyService.js`](backend/src/services/dailyService.js) dependencies
   - Removed [`dailyConfig.js`](backend/src/utils/dailyConfig.js) and [`jitsiConfig.js`](backend/src/utils/jitsiConfig.js)

4. **Controller Updates**
   - [`videoSessionController.js`](backend/src/controllers/videoSessionController.js): Removed Daily.co room creation logic

### Frontend Changes

1. **Utility Updates**
   - [`videoHelper.js`](frontend/src/utils/videoHelper.js): Replaced Daily.co integration with Google Meet link handling
   - Removed Jitsi helper dependencies

2. **Component Updates**
   - [`VideoSessionJoin.jsx`](frontend/src/components/video/VideoSessionJoin.jsx): Changed from embedded Daily.co to Google Meet redirect
   - [`VideoSessionsTab.jsx`](frontend/src/components/video/VideoSessionsTab.jsx): Updated to display and use Google Meet links

## Environment Configuration

### Required Environment Variables (Already Configured)
```bash
# Google Calendar OAuth (should already be set)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

### Removed Environment Variables
```bash
# No longer needed - can be removed
DAILY_API_KEY=your_daily_key
JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=your_jitsi_app_id
```

## Database Migration

### Apply Migration
```bash
# Connect to your PostgreSQL database
psql -h your_host -U your_user -d your_database

# Run the migration script
\i backend/migrations/20241221_add_meet_link_to_video_sessions.sql
```

### Verify Migration
```sql
-- Check that meet_link column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'video_sessions' 
AND column_name = 'meet_link';

-- Check some sample data
SELECT id, title, meet_link, google_event_id 
FROM video_sessions 
WHERE meet_link IS NOT NULL 
LIMIT 5;
```

## Testing the Integration

### 1. Create a Video Session
1. Log in as a partner
2. Navigate to Video Sessions tab
3. Click "Schedule Session"
4. Fill in session details and save
5. Verify that a Google Meet link is generated

### 2. Check Google Calendar Sync
1. Ensure partner has Google Calendar connected
2. Check that the calendar event was created with a Meet link
3. Verify the Meet link appears in the video session details

### 3. Join a Video Session
1. As a client, navigate to your dashboard
2. Find the upcoming video session
3. Click "Open Google Meet"
4. Verify that Google Meet opens in a new tab

### 4. Test Password Protection
1. Create a session with password enabled
2. As a client, try to join the session
3. Verify password prompt appears
4. Enter correct password and verify Meet link opens

## User Experience Changes

### For Therapists (Partners)
- **Before**: Embedded video in the app using Daily.co
- **After**: Redirect to Google Meet in new tab
- **Benefits**: Familiar Google Meet interface, better mobile support

### For Clients
- **Before**: Embedded video in the app
- **After**: Redirect to Google Meet in new tab
- **Benefits**: Familiar interface, better device compatibility

## Troubleshooting

### Google Meet Link Not Generated

1. **Check Google Calendar Connection**
   ```javascript
   // Verify partner has Google Calendar connected
   SELECT * FROM google_calendar_tokens 
   WHERE user_type = 'partner' 
   AND user_id = [partner_id];
   ```

2. **Check Google Calendar API Response**
   ```javascript
   // Look for conferenceData in the API response
   console.log('Event created:', response.data);
   console.log('Meet link:', response.data.hangoutLink);
   ```

3. **Verify Conference Data Version**
   ```javascript
   // Ensure conferenceDataVersion: 1 is set
   const response = await calendar.events.insert({
     calendarId: 'primary',
     resource: eventData,
     conferenceDataVersion: 1  // Important!
   });
   ```

### Legacy Session Compatibility

Sessions created before this migration will:
- Keep their existing `daily_room_url` data (copied to `meet_link`)
- Continue to work if the Daily.co rooms still exist
- Generate Google Meet links when updated and synced to Google Calendar

## Security Considerations

1. **Google Meet Security**
   - Meet links are generated by Google and are unique
   - Links are included in Google Calendar events
   - Password protection is handled at the application level

2. **Data Privacy**
   - No video data passes through your servers
   - Google handles all video encryption and security
   - Meet links are stored encrypted in the database

## Rollback Plan

If you need to revert to Daily.co/Jitsi:

1. **Restore Database**
   ```bash
   # Run the rollback section of the migration script
   psql -h your_host -U your_user -d your_database
   \i backend/migrations/20241221_add_meet_link_to_video_sessions.sql
   -- Then run the rollback section
   ```

2. **Restore Code**
   - Revert the Git commit containing these changes
   - Or restore from backup

3. **Update Environment**
   - Add back Daily.co/Jitsi environment variables
   - Remove any Google Meet specific configuration

## Performance Impact

- **Reduced API Calls**: No more Daily.co API calls
- **Faster Session Creation**: No waiting for Daily.co room creation
- **Improved Reliability**: Google Calendar API is more reliable than Daily.co

## Cost Impact

- **Daily.co Subscription**: Can be canceled
- **Google Calendar API**: No additional cost (included in existing OAuth)
- **Google Meet**: Free for Google Workspace users

## Support and Documentation

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Meet Support](https://support.google.com/meet)
- [TheraP Track Documentation](README.md)

## Next Steps

1. **Deploy Changes**: Follow your normal deployment process
2. **Run Migration**: Apply the database migration
3. **Test Thoroughly**: Test all video session workflows
4. **Monitor**: Watch for any issues in the first week
5. **Update Users**: Notify therapists and clients of the change
6. **Cancel Daily.co**: After confirming everything works, cancel Daily.co subscription

## Questions or Issues?

If you encounter any issues during the migration:

1. Check the logs for Google Calendar API errors
2. Verify OAuth credentials are still valid
3. Ensure the migration script ran successfully
4. Check that all environment variables are set correctly
5. Contact support with specific error messages

---

**Migration Completed**: December 21, 2024
**Version**: 1.0.0
**Author**: TheraP Track Development Team