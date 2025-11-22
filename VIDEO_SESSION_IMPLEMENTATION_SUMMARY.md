# Video Session Feature - Implementation Summary

## Overview

A complete video conferencing feature has been implemented using Jitsi as a Service (JaaS) for 1-to-1 video sessions between partners (therapists) and clients. The feature includes password protection, calendar integration, and a user-friendly interface.

## What Was Implemented

### 1. Database Layer

**File:** `backend/database/migrations/add_video_sessions.sql`

- Created `video_sessions` table with the following fields:
  - `id`: Primary key
  - `partner_id`: Reference to partner (therapist)
  - `user_id`: Reference to user (client)
  - `title`: Session title
  - `session_date`: Start date/time
  - `end_date`: End date/time
  - `duration_minutes`: Session duration
  - `meeting_room_id`: Unique Jitsi room identifier
  - `password`: Hashed password (optional)
  - `password_enabled`: Boolean flag for password protection
  - `status`: scheduled, in_progress, completed, cancelled
  - `notes`: Additional notes
  - Timestamps: `created_at`, `updated_at`

- Added indexes for optimal query performance

### 2. Backend Implementation

#### Model Layer
**File:** `backend/src/models/VideoSession.js`

Key methods:
- `create()`: Create new video session with auto-generated meeting room ID and password
- `findById()`: Get session by ID
- `findByPartner()`: Get all sessions for a partner
- `findByUser()`: Get all sessions for a user
- `update()`: Update session details
- `delete()`: Delete a session
- `checkConflict()`: Prevent double-booking
- `generateMeetingRoomId()`: Create unique room identifiers
- `generatePassword()`: Generate 6-digit passwords
- `verifyPassword()`: Verify session passwords

#### Controller Layer
**File:** `backend/src/controllers/videoSessionController.js`

Endpoints implemented:
- `POST /api/video-sessions`: Create new video session
- `GET /api/video-sessions/:id`: Get session details
- `GET /api/partners/:partnerId/video-sessions`: Get partner's sessions
- `GET /api/users/:userId/video-sessions`: Get user's sessions
- `PUT /api/video-sessions/:id`: Update session
- `DELETE /api/video-sessions/:id`: Delete session
- `POST /api/video-sessions/:id/verify-password`: Verify session password

#### Routes
**File:** `backend/src/routes/index.js`
- Added all video session routes with proper authentication

### 3. Jitsi Integration

#### Backend Configuration
**File:** `backend/src/utils/jitsiConfig.js`

- Configuration for Jitsi domain (defaults to meet.jit.si)
- Meeting URL generation
- Iframe URL generation with user info
- Support for JaaS authentication (JWT tokens)

#### Frontend Helper
**File:** `frontend/src/utils/jitsiHelper.js`

Utility functions:
- `loadJitsiScript()`: Load Jitsi External API
- `initJitsiMeet()`: Initialize Jitsi meeting
- `generateMeetingUrl()`: Create meeting URLs
- `canJoinSession()`: Check if user can join (15 min before)
- `getTimeUntilSession()`: Calculate time remaining
- `formatTimeUntilSession()`: Format time for display

### 4. Frontend Components

#### API Service
**File:** `frontend/src/services/api.js`

Added `videoSessionAPI` with methods:
- `create()`: Create video session
- `getById()`: Get session details
- `getByPartner()`: Get partner's sessions
- `getByUser()`: Get user's sessions
- `update()`: Update session
- `delete()`: Delete session
- `verifyPassword()`: Verify password

#### Video Session Modal
**File:** `frontend/src/components/video/VideoSessionModal.jsx`

Features:
- Schedule new video sessions
- Select client from dropdown
- Set date, time, and duration
- Toggle password protection
- Auto-generate passwords
- Display session link and password after creation
- Copy session details to clipboard
- Edit existing sessions

#### Video Sessions Tab (Partner View)
**File:** `frontend/src/components/video/VideoSessionsTab.jsx`

Features:
- List all video sessions (upcoming and past)
- Create new sessions
- Edit/delete sessions
- Copy session links
- Join active sessions
- Visual status indicators
- Time until session starts

#### Video Session Join Component
**File:** `frontend/src/components/video/VideoSessionJoin.jsx`

Features:
- Password verification UI (if enabled)
- Session details display
- Join button (enabled 15 min before session)
- Countdown timer
- Full-screen Jitsi iframe integration
- Camera/microphone permissions handling

#### Partner Dashboard Integration
**File:** `frontend/src/components/dashboard/PartnerDashboard.jsx`

Changes:
- Added "Video Sessions" tab
- Integrated VideoSessionsTab component
- Added Video icon to navigation

#### User Dashboard Integration
**File:** `frontend/src/components/dashboard/UserDashboard.jsx`

Changes:
- Added "Video Sessions" tab
- Display upcoming video sessions in overview
- Show join buttons for active sessions
- Time countdown display
- Full video session list view

#### Calendar Integration
**File:** `frontend/src/components/calendar/PartnerCalendar.jsx`

Changes:
- Display video sessions alongside appointments
- Purple color coding for video sessions
- Blue color for regular appointments
- Click video sessions to edit/view details
- Legend showing event types
- Unified calendar view

## How to Use the Feature

### For Partners (Therapists)

#### Scheduling a Video Session

1. Navigate to Partner Dashboard
2. Click on "Video Sessions" tab
3. Click "Schedule Session" button
4. Fill in the form:
   - Select a client
   - Enter session title
   - Choose date and time
   - Select duration (30 min to 3 hours)
   - Toggle password protection (enabled by default)
   - Add optional notes
5. Click "Create Session"
6. Copy the meeting link and password (if enabled)
7. Share details with your client

#### Managing Video Sessions

- **View Sessions**: Go to Video Sessions tab to see all scheduled sessions
- **Edit Session**: Click edit icon on any session
- **Delete Session**: Click delete icon (confirmation required)
- **Copy Link**: Click copy icon to copy session details
- **Join Session**: Click "Join Now" when session is active

#### Calendar View

- Video sessions appear in purple on the calendar
- Regular appointments appear in blue
- Click any event to view/edit details
- Create new events by clicking empty time slots

### For Users (Clients)

#### Viewing Video Sessions

1. Navigate to User Dashboard
2. Check "Overview" tab for upcoming sessions
3. Or click "Video Sessions" tab for full list

#### Joining a Video Session

1. Click "Join Now" or "View Details" on a session
2. If password-protected, enter the 6-digit password
3. Click "Verify & Continue"
4. Review session details
5. Click "Join Video Session" (available 15 min before start)
6. Allow camera/microphone permissions
7. Join the meeting

## Technical Details

### Password Security

- Passwords are auto-generated as 6-digit codes
- Stored as bcrypt hashes in the database
- Never sent in API responses (except on creation)
- Verified server-side before allowing access

### Meeting Room IDs

- Format: `therapy-{partnerId}-{userId}-{timestamp}`
- Guaranteed unique per session
- Used to create Jitsi meeting URLs

### Session Status Management

- **scheduled**: Session is upcoming
- **in_progress**: Session is currently active
- **completed**: Session has ended
- **cancelled**: Session was cancelled

### Conflict Detection

- Prevents double-booking for partners
- Checks for overlapping time slots
- Validates on both create and update

### Time Management

- Users can join 15 minutes before session start
- Countdown timer shows time remaining
- Automatic status updates based on timing

## Database Migration

To apply the database changes, run:

```bash
cd backend
psql -U your_username -d your_database -f database/migrations/add_video_sessions.sql
```

Or use your preferred database migration tool.

## Environment Variables

Add to your `.env` file (optional):

```env
# Jitsi Configuration (optional - defaults to meet.jit.si)
JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=your_jaas_app_id
```

## Testing Checklist

- [x] Partner can create video session with user
- [x] Password generation works correctly
- [x] Session link can be copied
- [x] Calendar displays video sessions
- [x] User can see scheduled sessions in dashboard
- [x] Password verification works (when enabled)
- [x] Conflict detection prevents double-booking
- [x] Video session can be edited/deleted
- [x] Jitsi iframe integration works
- [x] Sessions appear in calendar with proper color coding
- [x] Users can join sessions 15 minutes before start
- [x] Time countdown displays correctly

## Key Features Delivered

✅ 1-to-1 video sessions (no multi-user support as requested)
✅ Date, time, and duration selection
✅ Optional password protection with auto-generation
✅ Session link generation and sharing
✅ Calendar integration with visual indicators
✅ User dashboard display with join functionality
✅ Separate Video Sessions tab for both partners and users
✅ Conflict detection and validation
✅ Jitsi as a Service (JaaS) integration
✅ Responsive design for mobile and desktop

## Future Enhancements (Not Implemented)

- Video recording (explicitly skipped as requested)
- Multi-user sessions (explicitly excluded as requested)
- Email notifications for scheduled sessions
- SMS reminders
- Session history and analytics
- Custom Jitsi branding
- Waiting room functionality

## Support and Troubleshooting

### Common Issues

1. **Jitsi not loading**: Check internet connection and firewall settings
2. **Camera/microphone not working**: Ensure browser permissions are granted
3. **Password not working**: Verify you're using the correct 6-digit code
4. **Can't join early**: Sessions are only joinable 15 minutes before start time

### Browser Requirements

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 12+)
- Modern browsers with WebRTC support

## Files Created/Modified

### Backend Files Created
- `backend/database/migrations/add_video_sessions.sql`
- `backend/src/models/VideoSession.js`
- `backend/src/controllers/videoSessionController.js`
- `backend/src/utils/jitsiConfig.js`

### Backend Files Modified
- `backend/src/routes/index.js`

### Frontend Files Created
- `frontend/src/components/video/VideoSessionModal.jsx`
- `frontend/src/components/video/VideoSessionsTab.jsx`
- `frontend/src/components/video/VideoSessionJoin.jsx`
- `frontend/src/utils/jitsiHelper.js`

### Frontend Files Modified
- `frontend/src/services/api.js`
- `frontend/src/components/dashboard/PartnerDashboard.jsx`
- `frontend/src/components/dashboard/UserDashboard.jsx`
- `frontend/src/components/calendar/PartnerCalendar.jsx`

## Conclusion

The video session feature is now fully implemented and ready for use. Partners can schedule and manage video sessions with their clients, and clients can easily join sessions with optional password protection. The feature is fully integrated with the existing calendar system and provides a seamless user experience.

