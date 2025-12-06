const { google } = require('googleapis');

/**
 * Google Calendar API Configuration
 * Initializes OAuth2 client for Google Calendar integration
 *
 * Environment Requirements:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 Client ID from Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret
 * - GOOGLE_REDIRECT_URI: Redirect URI for OAuth callback
 */

/**
 * Get Google OAuth2 configuration from environment
 * @returns {Object} OAuth2 configuration object
 * @throws {Error} If required environment variables are missing
 */
function getOAuth2Config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing required Google Calendar environment variables: ' +
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri
  };
}

/**
 * Create a new OAuth2 client
 * @returns {google.auth.OAuth2} Configured OAuth2 client
 */
function createOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getOAuth2Config();

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Get Google Calendar API instance
 * @param {google.auth.OAuth2} auth - Authenticated OAuth2 client
 * @returns {google.calendar} Google Calendar API instance
 */
function getCalendarAPI(auth) {
  return google.calendar({ version: 'v3', auth });
}

/**
 * OAuth2 scopes required for calendar event management
 * Using minimal scope for security: only event management
 */
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Generate OAuth2 authorization URL
 * @param {string} state - State parameter for CSRF protection (includes user info)
 * @returns {string} Authorization URL for user to visit
 */
function generateAuthUrl(state) {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: CALENDAR_SCOPES,
    state: state,
    prompt: 'consent' // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token object with access_token, refresh_token, expiry_date
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access token or refresh token');
    }

    return tokens;
  } catch (error) {
    // Log detailed error information for debugging
    console.error('Token exchange failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.data
    });

    // Provide more helpful error messages
    if (error.message && error.message.includes('invalid_grant')) {
      throw new Error('invalid_grant: Authorization code expired, already used, or redirect URI mismatch. Please check your GOOGLE_REDIRECT_URI matches Google Cloud Console exactly.');
    }

    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token from previous authorization
 * @returns {Promise<Object>} New token object with fresh access_token
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return credentials;
}

/**
 * Create authenticated OAuth2 client with tokens
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @returns {google.auth.OAuth2} Authenticated OAuth2 client
 */
function createAuthenticatedClient(accessToken, refreshToken) {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return oauth2Client;
}

module.exports = {
  createOAuth2Client,
  getCalendarAPI,
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  createAuthenticatedClient,
  CALENDAR_SCOPES
};
