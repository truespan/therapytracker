// Video helper utilities for Daily.co integration
import DailyIframe from '@daily-co/daily-js';

/**
 * Initialize Daily.co call
 * @param {string} roomUrl - Daily.co room URL
 * @param {HTMLElement} containerElement - DOM element to mount Daily call
 * @param {object} options - Additional configuration options
 * @returns {object} Daily call frame instance
 */
export const initDailyCall = (roomUrl, containerElement, options = {}) => {
  const callFrame = DailyIframe.createFrame(containerElement, {
    iframeStyle: {
      width: '100%',
      height: '100%',
      border: 0,
      borderRadius: '8px'
    },
    showLeaveButton: true,
    showFullscreenButton: true,
    showLocalVideo: true,
    showParticipantsBar: true,
    userName: options.displayName || 'Guest',
    ...options
  });

  // Join the call
  callFrame.join({ url: roomUrl });

  return callFrame;
};

/**
 * Get Daily.co room URL from session
 * @param {object} session - Video session object
 * @returns {string} Daily.co room URL
 */
export const getDailyRoomUrl = (session) => {
  return session.daily_room_url || session.meeting_room_id;
};

/**
 * Generate meeting URL (legacy fallback for Jitsi sessions)
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

/**
 * Cleanup Daily call frame
 * @param {object} callFrame - Daily call frame instance
 */
export const cleanupDailyCall = (callFrame) => {
  if (callFrame) {
    try {
      callFrame.destroy();
    } catch (error) {
      console.error('Error cleaning up Daily call:', error);
    }
  }
};
