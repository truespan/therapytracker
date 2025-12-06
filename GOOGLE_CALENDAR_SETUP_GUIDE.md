# Google Calendar Integration - Setup Guide

## ✅ What Has Been Implemented (Backend Complete)

The backend infrastructure for Google Calendar integration is now complete. This document outlines what's been done and what needs to be configured.

---

## Backend Files Created

### 1. Database Migration
**File**: `backend/database/migrations/add_google_calendar_integration.sql`
- Creates `google_calendar_tokens` table for storing encrypted OAuth tokens
- Adds sync tracking fields to `appointments` and `video_sessions` tables
- Includes indexes for performance

### 2. Encryption Service
**File**: `backend/src/services/encryptionService.js`
- AES-256-GCM encryption for OAuth tokens
- Secure token storage with encryption keys from environment

### 3. Google Calendar Configuration
**File**: `backend/src/config/googleCalendar.js`
- OAuth2 client initialization
- Auth URL generation
- Token exchange and refresh logic

### 4. Database Model
**File**: `backend/src/models/GoogleCalendarToken.js`
- CRUD operations for token management
- Token expiration checking
- Sync status tracking

### 5. Core Sync Service
**File**: `backend/src/services/googleCalendarService.js` ⭐ **MOST IMPORTANT**
- OAuth flow handling
- Appointment sync to Google Calendar
- Video session sync to Google Calendar
- Event creation, update, and deletion
- Automatic token refresh

### 6. API Controller
**File**: `backend/src/controllers/googleCalendarController.js`
- OAuth initiation endpoint
- OAuth callback handler
- Connection status check
- Disconnect functionality
- Manual resync for failed events

### 7. Modified Controllers
**Files**:
- `backend/src/controllers/appointmentController.js` - Added sync hooks after create/update/delete
- `backend/src/controllers/videoSessionController.js` - Added sync hooks after create/update/delete

### 8. Routes
**File**: `backend/src/routes/index.js`
- Added 6 Google Calendar routes:
  - GET `/google-calendar/auth` - Initiate OAuth
  - GET `/google-calendar/callback` - Handle OAuth callback
  - GET `/google-calendar/status` - Check connection status
  - POST `/google-calendar/disconnect` - Disconnect calendar
  - POST `/google-calendar/resync/:eventType/:eventId` - Manual resync
  - POST `/google-calendar/toggle-sync` - Enable/disable sync

### 9. Dependencies
**Package**: `googleapis` v128.0.0 installed via npm

---

## 🔧 Required Configuration Steps

### Step 1: Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Name it something like "Therapy Tracker Calendar Sync"

2. **Enable Google Calendar API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Therapy Tracker OAuth"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - Your production frontend URL
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (development)
     - Your production callback URL
   - Click "Create"
   - **Save the Client ID and Client Secret**

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - User Type: External (for testing) or Internal (if using Workspace)
   - Fill in app information:
     - App name: "Therapy Tracker"
     - User support email: Your email
     - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar.events`
   - **Publishing Status**: The app will be in "Testing" mode by default
   - **Add Test Users** (IMPORTANT for Testing Mode):
     - Scroll down to "Test users" section
     - Click "+ ADD USERS"
     - Add the email addresses of users who will test the integration
     - These users can use the app without seeing the verification warning
     - Click "SAVE"

### Step 2: Environment Variables

Add these variables to `backend/.env`:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Encryption Key (32 characters) - Generate a new one!
ENCRYPTION_KEY=your_32_character_encryption_key
```

**To generate a secure encryption key**, run this command in Node.js:
```javascript
require('crypto').randomBytes(32).toString('hex').substring(0, 32)
```

Or use this one-liner in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex').substring(0, 32))"
```

### Step 3: Run Database Migration

Execute the SQL migration to add necessary tables and fields:

```bash
psql -U your_postgres_user -d therapy_tracker -f backend/database/migrations/add_google_calendar_integration.sql
```

Or run it through your database management tool (pgAdmin, DBeaver, etc.).

### Step 4: Restart Backend Server

After adding environment variables, restart your backend:

```bash
cd backend
npm start
```

---

## 🎯 How It Works

### OAuth Flow (User Connects Google Calendar)

1. User clicks "Connect Google Calendar" in frontend
2. Frontend calls `GET /api/google-calendar/auth`
3. Backend generates OAuth URL with state parameter
4. User is redirected to Google's consent screen
5. User authorizes the app (grants calendar.events permission)
6. Google redirects back to `/auth/google/callback?code=xxx&state=yyy`
7. Frontend sends code to `GET /api/google-calendar/callback`
8. Backend exchanges code for tokens, encrypts them, stores in database
9. User's calendar is now connected!

### Automatic Sync (When Appointments/Videos are Created)

1. Partner creates an appointment or video session
2. Appointment saved to database
3. `googleCalendarService.syncAppointmentToGoogle(id)` is called
4. Service checks if partner has Google Calendar connected
5. If connected:
   - Gets tokens from database
   - Refreshes access token if expired
   - Formats event data for Google Calendar
   - Creates event in Google Calendar
   - Stores Google event ID in database
   - Updates sync status to 'synced'
6. If not connected or sync fails:
   - Updates sync status to 'not_synced' or 'failed'
   - Stores error message
   - **Appointment creation still succeeds** (non-blocking)

### Update and Delete Sync

- **Updates**: When appointment/video is updated → Google Calendar event is updated
- **Deletes**: When appointment/video is deleted → Google Calendar event is deleted

---

## 📊 Sync Status Tracking

Each appointment and video session has these Google Calendar fields:

- `google_event_id` - The Google Calendar event ID
- `google_sync_status` - One of:
  - `pending` - Not yet synced
  - `synced` - Successfully synced
  - `failed` - Sync attempt failed
  - `not_synced` - User doesn't have Google Calendar connected
- `google_last_synced_at` - Timestamp of last successful sync
- `google_sync_error` - Error message if sync failed

---

## 🔒 Security Features

1. **Token Encryption**: All OAuth tokens encrypted with AES-256-GCM before storage
2. **Secure State Parameter**: CSRF protection with user ID and timestamp in state
3. **Minimal Permissions**: Only requests `calendar.events` scope
4. **Token Refresh**: Automatic refresh of expired access tokens
5. **Non-Blocking Sync**: App continues to work even if Google sync fails

---

## 🧪 Testing the Integration

### Test OAuth Flow

1. Start backend server
2. Call `GET /api/google-calendar/auth` (authenticated)
3. Visit the returned `authUrl`
4. Authorize the app
5. Check that tokens are stored in `google_calendar_tokens` table

### Test Appointment Sync

1. Create an appointment via API
2. Check Google Calendar - event should appear
3. Update the appointment
4. Check Google Calendar - event should be updated
5. Delete the appointment
6. Check Google Calendar - event should be removed

### Test Status Endpoint

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/google-calendar/status
```

Should return:
```json
{
  "connected": true,
  "syncEnabled": true,
  "connectedAt": "2025-12-05T...",
  "lastSyncedAt": "2025-12-05T...",
  "calendarId": "primary"
}
```

---

## 🚀 Next Steps: Frontend Implementation

The backend is complete! Next, you need to implement the frontend:

### Frontend Files to Create

1. **Settings Component**
   - `frontend/src/components/settings/GoogleCalendarSettings.jsx`
   - Connection UI with connect/disconnect buttons
   - Sync status display
   - Recent activity list

2. **OAuth Callback Page**
   - `frontend/src/pages/GoogleCalendarCallback.jsx`
   - Handles OAuth redirect
   - Exchanges code for tokens via backend
   - Redirects to dashboard

3. **API Service**
   - `frontend/src/services/googleCalendarAPI.js`
   - API client methods for all endpoints

4. **UI Enhancements**
   - Add sync status indicators to calendar events
   - Add connection banners to dashboards
   - Update modals to show sync info

### Frontend Routes to Add

Add to `App.jsx` or your router:
```javascript
<Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
```

---

## 📝 Summary

✅ **Backend Complete**: All infrastructure is in place
✅ **Database Migration**: Ready to run
✅ **API Endpoints**: 6 endpoints ready to use
✅ **Sync Logic**: Automatic sync on create/update/delete
✅ **Security**: Token encryption and CSRF protection
✅ **Error Handling**: Non-blocking, graceful degradation

**What's Next**:
1. Run database migration
2. Configure Google Cloud Console
3. Add environment variables
4. Test OAuth flow
5. Implement frontend components (see plan for details)

---

## 🆘 Troubleshooting

### "Google hasn't verified this app" Warning
**Problem**: You see a warning saying "Google hasn't verified this app" when trying to connect.

**Solution (Quick Fix - For Testing)**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "OAuth consent screen"
3. Scroll down to the "Test users" section
4. Click "+ ADD USERS"
5. Add the email address of the Google account you're using to test
6. Click "SAVE"
7. Try connecting again - the warning should be gone for test users

**Solution (Production - App Verification)**:
For production use, you need to submit your app for Google verification:
1. Complete all required fields in OAuth consent screen
2. Add a privacy policy URL (required for verification)
3. Add a terms of service URL (recommended)
4. Click "PUBLISH APP" (or submit for verification)
5. Google will review your app (can take several days to weeks)
6. Once verified, all users can use the app without warnings

**Note**: For internal Google Workspace apps, you can mark it as "Internal" and skip verification.

### "ENCRYPTION_KEY environment variable is not set"
- Add `ENCRYPTION_KEY` to `backend/.env` (must be exactly 32 characters)

### "Missing required Google Calendar environment variables"
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to `.env`

### "Invalid encrypted text format"
- Encryption key changed - tokens need to be re-created
- User should disconnect and reconnect

### "Google Calendar token expired. Please reconnect."
- Refresh token is invalid or revoked
- User needs to disconnect and reconnect

### Sync status stuck on "pending"
- Check if user has Google Calendar connected
- Try manual resync via `/api/google-calendar/resync/appointment/:id`

---

## 📚 API Documentation

### GET /api/google-calendar/auth
**Auth**: Required
**Returns**: `{ success: true, authUrl: "https://..." }`

### GET /api/google-calendar/callback?code=xxx&state=yyy
**Auth**: Required
**Returns**: `{ success: true, message: "..." }`

### GET /api/google-calendar/status
**Auth**: Required
**Returns**: Connection status object

### POST /api/google-calendar/disconnect
**Auth**: Required
**Returns**: `{ success: true, message: "..." }`

### POST /api/google-calendar/resync/:eventType/:eventId
**Auth**: Required
**Params**: `eventType` = 'appointment' or 'video', `eventId` = numeric ID
**Returns**: `{ success: true, eventId: "..." }`

### POST /api/google-calendar/toggle-sync
**Auth**: Required
**Body**: `{ enabled: boolean }`
**Returns**: `{ success: true, syncEnabled: boolean }`

---

**Implementation Date**: December 5, 2025
**Status**: Backend Complete ✅ | Frontend Pending ⏳
