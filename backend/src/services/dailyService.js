const axios = require('axios');

const DAILY_API_URL = 'https://api.daily.co/v1';
const DAILY_API_KEY = process.env.DAILY_API_KEY;

if (!DAILY_API_KEY) {
  console.warn('WARNING: DAILY_API_KEY not found in environment variables');
}

const dailyAxios = axios.create({
  baseURL: DAILY_API_URL,
  headers: {
    'Authorization': `Bearer ${DAILY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Create a Daily.co room for a video session
 * @param {Object} config - Room configuration
 * @param {string} config.name - Unique room name (meeting_room_id)
 * @param {number} config.expirationTime - Unix timestamp when room should expire
 * @param {number} config.maxParticipants - Maximum participants (default: 2 for 1-to-1 therapy)
 * @returns {Promise<Object>} Room object with url, name, and other properties
 */
const createDailyRoom = async ({ name, expirationTime, maxParticipants = 2 }) => {
  try {
    const response = await dailyAxios.post('/rooms', {
      name,
      privacy: 'public', // Public with application-level password protection
      properties: {
        exp: expirationTime,
        enable_prejoin_ui: true, // Allow device testing before joining
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: false,
        enable_network_ui: false, // Network quality UI (disabled for free plan)
        enable_noise_cancellation_ui: false, // Noise cancellation (disabled for free plan - requires paid tier)
        max_participants: maxParticipants,
        start_video_off: false,
        start_audio_off: false,
        owner_only_broadcast: false
      }
    });

    console.log(`Daily.co room created: ${response.data.url}`);
    return response.data;
  } catch (error) {
    // Handle room already exists (409 Conflict)
    if (error.response && error.response.status === 409) {
      console.log(`Room ${name} already exists, fetching existing room`);
      return await getDailyRoom(name);
    }

    // Handle rate limiting (429 Too Many Requests)
    if (error.response && error.response.status === 429) {
      throw new Error('Daily.co API rate limit exceeded. Please try again later.');
    }

    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      throw new Error('Daily.co API authentication failed. Check DAILY_API_KEY.');
    }

    console.error('Failed to create Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to create video room: ${error.response?.data?.error || error.message}`);
  }
};

/**
 * Get details of an existing Daily.co room
 * @param {string} roomName - Room name to fetch
 * @returns {Promise<Object>} Room object
 */
const getDailyRoom = async (roomName) => {
  try {
    const response = await dailyAxios.get(`/rooms/${roomName}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`Room ${roomName} not found`);
    }
    console.error('Failed to get Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to fetch video room: ${error.response?.data?.error || error.message}`);
  }
};

/**
 * Delete a Daily.co room
 * @param {string} roomName - Room name to delete
 * @returns {Promise<void>}
 */
const deleteDailyRoom = async (roomName) => {
  try {
    await dailyAxios.delete(`/rooms/${roomName}`);
    console.log(`Daily.co room deleted: ${roomName}`);
  } catch (error) {
    // Don't throw if room doesn't exist (already deleted or never created)
    if (error.response && error.response.status === 404) {
      console.log(`Room ${roomName} not found, may have already been deleted`);
      return;
    }
    console.error('Failed to delete Daily.co room:', error.response?.data || error.message);
    // Non-blocking: log error but don't throw
    // This ensures session deletion continues even if Daily API fails
  }
};

/**
 * Update a Daily.co room configuration
 * @param {string} roomName - Room name to update
 * @param {Object} updates - Room properties to update
 * @returns {Promise<Object>} Updated room object
 */
const updateDailyRoom = async (roomName, updates) => {
  try {
    const response = await dailyAxios.post(`/rooms/${roomName}`, updates);
    console.log(`Daily.co room updated: ${roomName}`);
    return response.data;
  } catch (error) {
    console.error('Failed to update Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to update video room: ${error.response?.data?.error || error.message}`);
  }
};

module.exports = {
  createDailyRoom,
  getDailyRoom,
  deleteDailyRoom,
  updateDailyRoom
};
