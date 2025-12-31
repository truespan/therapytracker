const {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  createAuthenticatedClient,
  getCalendarAPI
} = require('../config/googleCalendar');
const { encrypt, decrypt } = require('./encryptionService');
const GoogleCalendarToken = require('../models/GoogleCalendarToken');
const Appointment = require('../models/Appointment');
const VideoSession = require('../models/VideoSession');
const Partner = require('../models/Partner');
const pool = require('../config/database');

/**
 * Google Calendar Service
 * Core service for syncing appointments and video sessions to Google Calendar
 */

/**
 * Generate OAuth URL for user to authorize Google Calendar access
 * @param {string} userType - 'user' or 'partner'
 * @param {number} userId - User or partner ID
 * @returns {string} Authorization URL
 */
function getAuthUrl(userType, userId) {
  // Create state parameter with user info (for CSRF protection)
  const state = Buffer.from(JSON.stringify({
    userType,
    userId,
    timestamp: Date.now()
  })).toString('base64');

  return generateAuthUrl(state);
}

/**
 * Handle OAuth callback and store tokens
 * @param {string} code - Authorization code from Google
 * @param {string} state - State parameter from auth URL
 * @returns {Promise<Object>} Created token record
 */
async function handleOAuthCallback(code, state) {
  try {
    // Decode and validate state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (stateError) {
      console.error('Invalid state parameter:', stateError);
      throw new Error('Invalid state parameter. Please try connecting again.');
    }

    const { userType, userId, timestamp } = stateData;

    if (!userType || !userId) {
      throw new Error('Invalid state data. Missing user information.');
    }

    // Validate state timestamp (prevent replay attacks)
    const stateAge = Date.now() - timestamp;
    const MAX_STATE_AGE = 30 * 60 * 1000; // 30 minutes (increased for production where users may take longer)
    if (stateAge > MAX_STATE_AGE) {
      throw new Error('OAuth state expired. Please try connecting again.');
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
    } catch (tokenError) {
      console.error('[Google Calendar Service] Token exchange error details:', {
        message: tokenError.message,
        code: tokenError.code,
        response: tokenError.response,
        responseData: tokenError.response?.data,
        stack: tokenError.stack,
        fullError: JSON.stringify(tokenError, Object.getOwnPropertyNames(tokenError))
      });
      
      // Check for invalid_grant in various places
      const errorMessage = tokenError.message || '';
      const errorResponse = tokenError.response?.data || {};
      const errorString = JSON.stringify(errorResponse);
      
      if (errorMessage.includes('invalid_grant') || 
          errorString.includes('invalid_grant') ||
          errorResponse.error === 'invalid_grant') {
        console.error('[Google Calendar Service] Invalid grant detected. Original error:', {
          message: errorMessage,
          response: errorResponse,
          redirectUri: process.env.GOOGLE_REDIRECT_URI
        });
        throw new Error(`Authorization code expired or already used. Original error: ${errorMessage || JSON.stringify(errorResponse)}`);
      }
      throw tokenError;
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access token or refresh token from Google');
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate expiry date
    const expiryDate = new Date(tokens.expiry_date || Date.now() + 3600000); // 1 hour default

    // Store in database
    const tokenRecord = await GoogleCalendarToken.create(userType, userId, {
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      token_expires_at: expiryDate
    });

    return {
      success: true,
      message: 'Successfully connected to Google Calendar',
      tokenRecord: {
        id: tokenRecord.id,
        userType: tokenRecord.user_type,
        userId: tokenRecord.user_id,
        connectedAt: tokenRecord.connected_at
      }
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    throw error;
  }
}

/**
 * Get authenticated Google Calendar client
 * Automatically refreshes token if expired
 * @param {string} userType - 'user' or 'partner'
 * @param {number} userId - User or partner ID
 * @returns {Promise<Object>} Authenticated calendar API client
 */
async function getAuthenticatedClient(userType, userId) {
  // Get token from database
  const tokenRecord = await GoogleCalendarToken.findByUser(userType, userId);

  if (!tokenRecord) {
    throw new Error('Google Calendar not connected for this user');
  }

  if (!tokenRecord.sync_enabled) {
    throw new Error('Google Calendar sync is disabled');
  }

  // Decrypt tokens
  let accessToken = decrypt(tokenRecord.encrypted_access_token);
  const refreshToken = decrypt(tokenRecord.encrypted_refresh_token);

  // Check if token is expired and refresh if needed
  if (GoogleCalendarToken.isTokenExpired(tokenRecord.token_expires_at)) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);

      // Encrypt and update access token
      const encryptedAccessToken = encrypt(newTokens.access_token);
      const expiryDate = new Date(newTokens.expiry_date || Date.now() + 3600000);

      await GoogleCalendarToken.update(tokenRecord.id, {
        encrypted_access_token: encryptedAccessToken,
        token_expires_at: expiryDate
      });

      accessToken = newTokens.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Google Calendar token expired. Please reconnect.');
    }
  }

  // Create authenticated client
  const auth = createAuthenticatedClient(accessToken, refreshToken);
  return getCalendarAPI(auth);
}

/**
 * Format event data for Google Calendar API
 * @param {string} eventType - 'appointment' or 'video'
 * @param {Object} eventData - Event data from database
 * @param {string} organizerEmail - Email of the event organizer (therapist)
 * @param {string} clientEmail - Email of the client (for video sessions)
 * @returns {Object} Formatted event for Google Calendar API
 */
function formatEventData(eventType, eventData, organizerEmail = null, clientEmail = null) {
  const isVideo = eventType === 'video';

  // Base event structure
  const event = {
    summary: `${isVideo ? '🎥 Video Session' : 'Appointment'}: ${eventData.user_name} - ${eventData.title}`,
    description: '',
    start: {
      dateTime: eventData.appointment_date || eventData.session_date,
      timeZone: 'UTC'
    },
    end: {
      dateTime: eventData.end_date,
      timeZone: 'UTC'
    },
    colorId: isVideo ? '9' : '7', // Purple for video, Blue for appointments
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 }
      ]
    },
    // Critical settings for meeting access
    guestsCanSeeOtherGuests: true,
    guestsCanInviteOthers: false, // Prevent forwarding to maintain privacy
    transparency: 'opaque', // Show as busy
    visibility: 'private' // Keep session private
  };

  // Build description
  let description = '';
  if (eventData.notes) {
    description += `${eventData.notes}\n\n`;
  }
  description += 'Managed by TheraP Track\n';

  if (isVideo && eventData.meet_link) {
    description += `\nJoin video session: ${eventData.meet_link}\n`;
    if (eventData.password_enabled) {
      description += 'Password protected (check app for password)\n';
    }
  }

  event.description = description;

  // Add conference data for video sessions to create Google Meet links
  if (isVideo && !eventData.google_event_id) {
    event.conferenceData = {
      createRequest: {
        requestId: `${eventData.meeting_room_id || 'meet'}-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        },
        status: {
          statusCode: 'success'
        },
        // Add entry points for better meeting configuration
        entryPoints: [
          {
            entryPointType: 'video',
            uri: eventData.meet_link || '',
            label: 'Google Meet'
          }
        ]
      }
    };
  }

  // Set attendees for video sessions - THIS IS THE CRITICAL FIX
  if (isVideo && organizerEmail) {
    const attendees = [];
    
    // Add therapist as organizer
    attendees.push({
      email: organizerEmail,
      organizer: true,
      responseStatus: 'accepted',
      self: true,
      displayName: eventData.partner_name || 'Therapist'
    });

    // Add client as attendee - FIXES "ASKING TO JOIN" ISSUE
    if (clientEmail) {
      attendees.push({
        email: clientEmail,
        organizer: false,
        responseStatus: 'needsAction',
        displayName: eventData.user_name || 'Client'
      });
    }

    event.attendees = attendees;
    
    // Set organizer
    event.creator = {
      email: organizerEmail,
      self: true,
      displayName: eventData.partner_name || 'Therapist'
    };
    event.organizer = {
      email: organizerEmail,
      self: true,
      displayName: eventData.partner_name || 'Therapist'
    };
  }

  return event;
}

/**
 * Sync appointment to Google Calendar
 * @param {number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Sync result
 */
async function syncAppointmentToGoogle(appointmentId) {
  try {
    // Get appointment data
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Determine which user's calendar to sync to (partner creates, both should see it)
    // For now, sync to partner's calendar
    const userType = 'partner';
    const userId = appointment.partner_id;

    // Check if user has Google Calendar connected
    const tokenRecord = await GoogleCalendarToken.findByUser(userType, userId);
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      // Mark as not_synced
      await updateAppointmentSyncStatus(appointmentId, 'not_synced', null, 'Google Calendar not connected');
      return { success: false, reason: 'not_connected' };
    }

    // Get authenticated client
    const calendar = await getAuthenticatedClient(userType, userId);

    // Format event data
    const eventData = formatEventData('appointment', appointment);

    // Check if event already exists (update vs create)
    if (appointment.google_event_id) {
      // Update existing event
      await calendar.events.update({
        calendarId: 'primary',
        eventId: appointment.google_event_id,
        resource: eventData
      });

      await updateAppointmentSyncStatus(appointmentId, 'synced', appointment.google_event_id, null);

      return {
        success: true,
        action: 'updated',
        eventId: appointment.google_event_id
      };
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: eventData
      });

      const googleEventId = response.data.id;
      await updateAppointmentSyncStatus(appointmentId, 'synced', googleEventId, null);

      return {
        success: true,
        action: 'created',
        eventId: googleEventId
      };
    }
  } catch (error) {
    console.error('Appointment sync error:', error);
    await updateAppointmentSyncStatus(appointmentId, 'failed', null, error.message);
    throw error;
  }
}

/**
 * Sync video session to Google Calendar
 * @param {number} sessionId - Video session ID
 * @returns {Promise<Object>} Sync result
 */
async function syncVideoSessionToGoogle(sessionId) {
  try {
    // Get video session data
    const session = await VideoSession.findById(sessionId);
    if (!session) {
      throw new Error('Video session not found');
    }

    // Sync to partner's calendar
    const userType = 'partner';
    const userId = session.partner_id;

    // Check if user has Google Calendar connected
    const tokenRecord = await GoogleCalendarToken.findByUser(userType, userId);
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      await updateVideoSessionSyncStatus(sessionId, 'not_synced', null, 'Google Calendar not connected');
      return { success: false, reason: 'not_connected' };
    }

    // Get partner data
    const partner = await Partner.findById(session.partner_id);
    if (!partner || !partner.email) {
      throw new Error('Partner email not found');
    }

    // Get client data to add as attendee - THIS IS CRITICAL
    const User = require('../models/User');
    const client = await User.findById(session.user_id);

    const calendar = await getAuthenticatedClient(userType, userId);

    // Format event with BOTH organizer and client
    const eventData = formatEventData('video', {
      ...session,
      partner_name: partner.name,
      user_name: client?.name || 'Client'
    }, partner.email, client?.email || null);

    // Check if event already exists
    if (session.google_event_id) {
      // Update existing event
      await calendar.events.update({
        calendarId: 'primary',
        eventId: session.google_event_id,
        resource: eventData,
        conferenceDataVersion: 1,
        sendUpdates: 'all' // NOTIFY ATTENDEES
      });

      await updateVideoSessionSyncStatus(sessionId, 'synced', session.google_event_id, null);

      return {
        success: true,
        action: 'updated',
        eventId: session.google_event_id
      };
    } else {
      // Create new event with conference data to generate Meet link
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: eventData,
        conferenceDataVersion: 1, // Important: This tells Google to process conference data
        sendUpdates: 'all', // SEND INVITATIONS
        sendNotifications: true
      });

      const googleEventId = response.data.id;
      const meetLink = response.data.hangoutLink; // Google Meet link

      // Update session with Google event ID and Meet link
      if (meetLink) {
        await VideoSession.update(sessionId, {
          meet_link: meetLink
        });
      }

      await updateVideoSessionSyncStatus(sessionId, 'synced', googleEventId, null);

      return {
        success: true,
        action: 'created',
        eventId: googleEventId,
        meetLink: meetLink
      };
    }
  } catch (error) {
    console.error('Video session sync error:', error);
    await updateVideoSessionSyncStatus(sessionId, 'failed', null, error.message);
    throw error;
  }
}

/**
 * Delete appointment from Google Calendar
 * @param {number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteAppointmentFromGoogle(appointmentId) {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || !appointment.google_event_id) {
      return { success: true, reason: 'not_synced' };
    }

    const userType = 'partner';
    const userId = appointment.partner_id;

    const tokenRecord = await GoogleCalendarToken.findByUser(userType, userId);
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      return { success: true, reason: 'not_connected' };
    }

    const calendar = await getAuthenticatedClient(userType, userId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: appointment.google_event_id
    });

    return { success: true, action: 'deleted' };
  } catch (error) {
    // If event not found (404), that's okay
    if (error.code === 404 || error.message.includes('Not Found')) {
      return { success: true, reason: 'already_deleted' };
    }
    console.error('Appointment delete error:', error);
    throw error;
  }
}

/**
 * Delete video session from Google Calendar
 * @param {number} sessionId - Video session ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteVideoSessionFromGoogle(sessionId) {
  try {
    const session = await VideoSession.findById(sessionId);
    if (!session || !session.google_event_id) {
      return { success: true, reason: 'not_synced' };
    }

    const userType = 'partner';
    const userId = session.partner_id;

    const tokenRecord = await GoogleCalendarToken.findByUser(userType, userId);
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      return { success: true, reason: 'not_connected' };
    }

    const calendar = await getAuthenticatedClient(userType, userId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: session.google_event_id
    });

    return { success: true, action: 'deleted' };
  } catch (error) {
    if (error.code === 404 || error.message.includes('Not Found')) {
      return { success: true, reason: 'already_deleted' };
    }
    console.error('Video session delete error:', error);
    throw error;
  }
}

/**
 * Disconnect Google Calendar for user
 * @param {string} userType - 'user' or 'partner'
 * @param {number} userId - User or partner ID
 * @returns {Promise<boolean>} True if disconnected
 */
async function disconnectCalendar(userType, userId) {
  return await GoogleCalendarToken.delete(userType, userId);
}

/**
 * Update appointment sync status in database
 * @param {number} appointmentId - Appointment ID
 * @param {string} status - Sync status
 * @param {string|null} googleEventId - Google event ID
 * @param {string|null} error - Error message
 */
async function updateAppointmentSyncStatus(appointmentId, status, googleEventId, error) {
  const query = `
    UPDATE appointments
    SET
      google_sync_status = $1::varchar,
      google_event_id = CASE WHEN $2::text IS NOT NULL THEN $2::varchar ELSE google_event_id END,
      google_last_synced_at = CASE WHEN $1::varchar = 'synced' THEN NOW() ELSE google_last_synced_at END,
      google_sync_error = $3::text
    WHERE id = $4::integer
  `;

  await pool.query(query, [status, googleEventId || null, error || null, appointmentId]);
}

/**
 * Update video session sync status in database
 * @param {number} sessionId - Video session ID
 * @param {string} status - Sync status
 * @param {string|null} googleEventId - Google event ID
 * @param {string|null} error - Error message
 */
async function updateVideoSessionSyncStatus(sessionId, status, googleEventId, error) {
  const query = `
    UPDATE video_sessions
    SET
      google_sync_status = $1::varchar,
      google_event_id = CASE WHEN $2::text IS NOT NULL THEN $2::varchar ELSE google_event_id END,
      google_last_synced_at = CASE WHEN $1::varchar = 'synced' THEN NOW() ELSE google_last_synced_at END,
      google_sync_error = $3::text
    WHERE id = $4::integer
  `;

  await pool.query(query, [status, googleEventId || null, error || null, sessionId]);
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getAuthenticatedClient,
  syncAppointmentToGoogle,
  syncVideoSessionToGoogle,
  deleteAppointmentFromGoogle,
  deleteVideoSessionFromGoogle,
  disconnectCalendar
};
