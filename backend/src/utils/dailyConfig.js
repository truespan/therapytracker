// Daily.co configuration and helper utilities
// API documentation: https://docs.daily.co/reference/rest-api

const DAILY_CONFIG = {
  // Daily.co API configuration
  apiKey: process.env.DAILY_API_KEY,
  apiUrl: 'https://api.daily.co/v1',

  // Default room settings for video sessions
  defaultRoomSettings: {
    privacy: 'public', // Public rooms with application-level password protection
    properties: {
      enable_prejoin_ui: true,         // Allow device testing before joining
      enable_screenshare: true,         // Enable screen sharing
      enable_chat: true,                // Enable in-call chat
      enable_knocking: false,           // No knocking feature needed
      enable_network_ui: true,          // Show network quality indicator
      enable_noise_cancellation_ui: true, // Show noise cancellation option
      max_participants: 2,              // 1-to-1 therapy sessions
      start_video_off: false,           // Start with video on
      start_audio_off: false,           // Start with audio on
      owner_only_broadcast: false       // Both participants can broadcast
    }
  },

  // Room expiration buffer (minutes added after session ends)
  expirationBufferMinutes: 30
};

/**
 * Calculate expiration timestamp for a Daily.co room
 * @param {Date|string} sessionDate - Session start date
 * @param {number} durationMinutes - Session duration in minutes
 * @returns {number} Unix timestamp when room should expire
 */
function calculateRoomExpiration(sessionDate, durationMinutes) {
  const sessionStart = new Date(sessionDate);
  const bufferMinutes = DAILY_CONFIG.expirationBufferMinutes;
  const totalMinutes = durationMinutes + bufferMinutes;

  // Calculate expiration time (session end + buffer)
  const expirationTime = new Date(sessionStart.getTime() + totalMinutes * 60 * 1000);

  // Return Unix timestamp (seconds since epoch)
  return Math.floor(expirationTime.getTime() / 1000);
}

/**
 * Validate Daily.co configuration
 * @returns {boolean} True if configuration is valid
 */
function validateDailyConfig() {
  if (!DAILY_CONFIG.apiKey) {
    console.error('ERROR: DAILY_API_KEY not found in environment variables');
    return false;
  }

  if (DAILY_CONFIG.apiKey.length < 20) {
    console.error('ERROR: DAILY_API_KEY appears to be invalid (too short)');
    return false;
  }

  return true;
}

/**
 * Get Daily.co configuration for frontend
 * Note: API key should NEVER be sent to frontend
 * @returns {object} Safe configuration object for frontend
 */
function getDailyConfig() {
  return {
    maxParticipants: DAILY_CONFIG.defaultRoomSettings.properties.max_participants,
    enablePrejoinUi: DAILY_CONFIG.defaultRoomSettings.properties.enable_prejoin_ui,
    enableScreenshare: DAILY_CONFIG.defaultRoomSettings.properties.enable_screenshare,
    enableChat: DAILY_CONFIG.defaultRoomSettings.properties.enable_chat
  };
}

module.exports = {
  DAILY_CONFIG,
  calculateRoomExpiration,
  validateDailyConfig,
  getDailyConfig
};
