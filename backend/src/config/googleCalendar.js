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

  // Log the redirect URI for debugging (without exposing secret)
  console.log('[Google Calendar Config] Redirect URI:', redirectUri);
  console.log('[Google Calendar Config] Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET');

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
  const { redirectUri } = getOAuth2Config();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: CALENDAR_SCOPES,
    state: state,
    prompt: 'consent' // Force consent screen to get refresh token
  });

  console.log('[Google Calendar] Generated auth URL with redirect URI:', redirectUri);
  console.log('[Google Calendar] Auth URL (first 100 chars):', authUrl.substring(0, 100) + '...');

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token object with access_token, refresh_token, expiry_date
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { redirectUri } = getOAuth2Config();

  console.log('[Google Calendar] Exchanging code for tokens');
  console.log('[Google Calendar] Using redirect URI:', redirectUri);
  console.log('[Google Calendar] Code length:', code ? code.length : 0);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access token or refresh token');
    }

    console.log('[Google Calendar] Successfully obtained tokens');
    return tokens;
  } catch (error) {
    // Log detailed error information for debugging
    console.error('[Google Calendar] Token exchange failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.data,
      redirectUri: redirectUri
    });

    // Check for specific error types
    if (error.response?.data) {
      console.error('[Google Calendar] Error response data:', JSON.stringify(error.response.data, null, 2));
    }

    // Provide more helpful error messages
    if (error.message && error.message.includes('invalid_grant')) {
      const detailedError = `invalid_grant: Authorization code expired, already used, or redirect URI mismatch.
      
Current redirect URI: ${redirectUri}

Please verify:
1. GOOGLE_REDIRECT_URI in backend .env matches EXACTLY what's in Google Cloud Console
2. The redirect URI in Google Cloud Console includes: ${redirectUri}
3. You haven't refreshed the page or tried connecting twice
4. The code hasn't expired (try connecting again immediately)`;
      
      throw new Error(detailedError);
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
