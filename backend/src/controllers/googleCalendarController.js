const googleCalendarService = require('../services/googleCalendarService');
const GoogleCalendarToken = require('../models/GoogleCalendarToken');

/**
 * Google Calendar Controller
 * Handles API requests for Google Calendar integration
 */

/**
 * Initiate OAuth flow
 * GET /api/google-calendar/auth
 */
exports.initiateOAuth = async (req, res) => {
  try {
    const { userType, id } = req.user;

    // Generate auth URL
    const authUrl = googleCalendarService.getAuthUrl(userType, id);

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      error: 'Failed to initiate Google Calendar authorization',
      message: error.message
    });
  }
};

/**
 * Handle OAuth callback
 * GET /api/google-calendar/callback?code=xxx&state=yyy
 */
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    console.log('[Google Calendar Callback] Received callback');
    console.log('[Google Calendar Callback] Has code:', !!code);
    console.log('[Google Calendar Callback] Has state:', !!state);
    console.log('[Google Calendar Callback] Request URL:', req.url);
    console.log('[Google Calendar Callback] Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state parameter',
        message: 'Invalid OAuth callback. Please try connecting again.'
      });
    }

    // Process callback and store tokens
    const result = await googleCalendarService.handleOAuthCallback(code, state);

    console.log('[Google Calendar Callback] Successfully processed callback');
    res.json(result);
  } catch (error) {
    console.error('[Google Calendar Callback] Error handling OAuth callback:', error);
    console.error('[Google Calendar Callback] Request query:', req.query);
    console.error('[Google Calendar Callback] Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to connect Google Calendar';
    
    if (error.message && error.message.includes('invalid_grant')) {
      // Extract the detailed error message if it contains redirect URI info
      if (error.message.includes('Current redirect URI:')) {
        errorMessage = error.message; // Use the detailed message
      } else {
        errorMessage = 'Authorization code expired or already used. This can happen if you refresh the page or try connecting twice. Please go back to Settings and click "Connect Google Calendar" again.';
      }
    } else if (error.message && error.message.includes('redirect_uri_mismatch')) {
      errorMessage = 'Redirect URI mismatch. Please verify that GOOGLE_REDIRECT_URI in your backend environment matches exactly what is configured in Google Cloud Console (including http/https and trailing slashes).';
    }

    res.status(500).json({
      success: false,
      error: 'Failed to connect Google Calendar',
      message: errorMessage
    });
  }
};

/**
 * Get connection status
 * GET /api/google-calendar/status
 */
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userType, id } = req.user;

    // Check if user has connected Google Calendar
    const tokenRecord = await GoogleCalendarToken.findByUser(userType, id);

    if (!tokenRecord) {
      return res.json({
        connected: false
      });
    }

    res.json({
      connected: true,
      syncEnabled: tokenRecord.sync_enabled,
      connectedAt: tokenRecord.connected_at,
      lastSyncedAt: tokenRecord.last_synced_at,
      calendarId: tokenRecord.calendar_id
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      error: 'Failed to get connection status',
      message: error.message
    });
  }
};

/**
 * Disconnect Google Calendar
 * POST /api/google-calendar/disconnect
 */
exports.disconnectCalendar = async (req, res) => {
  try {
    const { userType, id } = req.user;

    // Delete token record
    const deleted = await googleCalendarService.disconnectCalendar(userType, id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Successfully disconnected Google Calendar'
      });
    } else {
      res.json({
        success: false,
        message: 'Google Calendar was not connected'
      });
    }
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({
      error: 'Failed to disconnect Google Calendar',
      message: error.message
    });
  }
};

/**
 * Manual resync for failed events
 * POST /api/google-calendar/resync/:eventType/:eventId
 * @param eventType - 'appointment' or 'video'
 * @param eventId - ID of appointment or video session
 */
exports.resyncEvent = async (req, res) => {
  try {
    const { eventType, eventId } = req.params;
    const { userType, id } = req.user;

    // Validate event type
    if (!['appointment', 'video'].includes(eventType)) {
      return res.status(400).json({
        error: 'Invalid event type. Must be "appointment" or "video"'
      });
    }

    // Check if user has Google Calendar connected
    const tokenRecord = await GoogleCalendarToken.findByUser(userType, id);
    if (!tokenRecord || !tokenRecord.sync_enabled) {
      return res.status(400).json({
        error: 'Google Calendar not connected or sync disabled'
      });
    }

    // Resync the event
    let result;
    if (eventType === 'appointment') {
      result = await googleCalendarService.syncAppointmentToGoogle(parseInt(eventId));
    } else {
      result = await googleCalendarService.syncVideoSessionToGoogle(parseInt(eventId));
    }

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully ${result.action} event in Google Calendar`,
        eventId: result.eventId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to sync event',
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Error resyncing event:', error);
    res.status(500).json({
      error: 'Failed to resync event',
      message: error.message
    });
  }
};

/**
 * Enable/disable sync
 * POST /api/google-calendar/toggle-sync
 */
exports.toggleSync = async (req, res) => {
  try {
    const { userType, id } = req.user;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request. "enabled" must be a boolean'
      });
    }

    let result;
    if (enabled) {
      result = await GoogleCalendarToken.enableSync(userType, id);
    } else {
      result = await GoogleCalendarToken.disableSync(userType, id);
    }

    if (result) {
      res.json({
        success: true,
        message: `Google Calendar sync ${enabled ? 'enabled' : 'disabled'}`,
        syncEnabled: result.sync_enabled
      });
    } else {
      res.status(404).json({
        error: 'Google Calendar not connected'
      });
    }
  } catch (error) {
    console.error('Error toggling sync:', error);
    res.status(500).json({
      error: 'Failed to toggle sync',
      message: error.message
    });
  }
};

module.exports = exports;
