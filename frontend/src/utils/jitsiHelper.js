// Jitsi helper utilities for frontend integration

/**
 * Load Jitsi Meet External API script
 * @returns {Promise} Resolves when script is loaded
 */
export const loadJitsiScript = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

/**
 * Initialize Jitsi Meet API
 * @param {string} domain - Jitsi domain (e.g., 'meet.jit.si')
 * @param {string} roomName - Meeting room name
 * @param {HTMLElement} containerElement - DOM element to mount Jitsi
 * @param {object} options - Additional configuration options
 * @returns {object} Jitsi API instance
 */
export const initJitsiMeet = (domain, roomName, containerElement, options = {}) => {
  const defaultOptions = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: containerElement,
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      prejoinPageEnabled: true,
      disableDeepLinking: true,
      ...options.configOverwrite
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      TOOLBAR_BUTTONS: [
        'microphone',
        'camera',
        'closedcaptions',
        'desktop',
        'fullscreen',
        'fodeviceselection',
        'hangup',
        'chat',
        'settings',
        'raisehand',
        'videoquality',
        'filmstrip',
        'tileview'
      ],
      ...options.interfaceConfigOverwrite
    },
    ...options
  };

  const api = new window.JitsiMeetExternalAPI(domain, defaultOptions);
  return api;
};

/**
 * Generate Jitsi meeting URL
 * @param {string} meetingRoomId - Unique meeting room identifier
 * @param {string} domain - Jitsi domain (default: 'meet.jit.si')
 * @returns {string} Full Jitsi meeting URL
 */
export const generateMeetingUrl = (meetingRoomId, domain = 'meet.jit.si') => {
  return `https://${domain}/${meetingRoomId}`;
};

/**
 * Format meeting room ID for display
 * @param {string} meetingRoomId - Meeting room ID
 * @returns {string} Formatted room ID
 */
export const formatRoomId = (meetingRoomId) => {
  return meetingRoomId.replace(/-/g, ' ').toUpperCase();
};

/**
 * Check if user can join session (based on time)
 * @param {string} sessionDate - Session start date/time
 * @param {number} minutesBefore - Minutes before session start to allow joining (default: 15)
 * @returns {boolean} Whether user can join
 */
export const canJoinSession = (sessionDate, minutesBefore = 15) => {
  const sessionTime = new Date(sessionDate).getTime();
  const now = Date.now();
  const allowedTime = sessionTime - (minutesBefore * 60 * 1000);
  
  return now >= allowedTime;
};

/**
 * Get time until session starts
 * @param {string} sessionDate - Session start date/time
 * @returns {object} Object with days, hours, minutes until session
 */
export const getTimeUntilSession = (sessionDate) => {
  const sessionTime = new Date(sessionDate).getTime();
  const now = Date.now();
  const diff = sessionTime - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, isPast: false };
};

/**
 * Format time until session for display
 * @param {string} sessionDate - Session start date/time
 * @returns {string} Formatted string (e.g., "2 hours 30 minutes")
 */
export const formatTimeUntilSession = (sessionDate) => {
  const { days, hours, minutes, isPast } = getTimeUntilSession(sessionDate);
  
  if (isPast) {
    return 'Session has started';
  }
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  
  return parts.join(' ') || 'Less than a minute';
};

