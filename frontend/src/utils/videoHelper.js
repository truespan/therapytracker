// Video helper utilities for Google Meet integration

/**
 * Get Google Meet link from session
 * @param {object} session - Video session object
 * @returns {string} Google Meet URL or null
 */
export const getMeetLink = (session) => {
  return session.meet_link || null;
};

/**
 * Check if session has a valid Google Meet link
 * @param {object} session - Video session object
 * @returns {boolean} Whether session has a Meet link
 */
export const hasMeetLink = (session) => {
  return Boolean(session.meet_link && session.meet_link.startsWith('https://meet.google.com/'));
};

/**
 * Open Google Meet link in new tab
 * @param {string} meetLink - Google Meet URL
 * @returns {void}
 */
export const openMeetLink = (meetLink) => {
  if (meetLink && meetLink.startsWith('https://meet.google.com/')) {
    window.open(meetLink, '_blank', 'noopener,noreferrer');
  } else {
    console.error('Invalid Google Meet link:', meetLink);
  }
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
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Whether copy was successful
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate shareable session information
 * @param {object} session - Video session object
 * @returns {string} Formatted share text
 */
export const generateShareText = (session) => {
  const meetLink = getMeetLink(session);
  const date = new Date(session.session_date).toLocaleDateString();
  const time = new Date(session.session_date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  let shareText = `Video Session: ${session.title}\n`;
  shareText += `Date: ${date}\n`;
  shareText += `Time: ${time}\n`;
  
  if (meetLink) {
    shareText += `\nJoin: ${meetLink}\n`;
  } else {
    shareText += `\nMeeting Room ID: ${session.meeting_room_id}\n`;
  }
  
  if (session.password_enabled) {
    shareText += '\nPassword protected (check app for password)\n';
  }

  return shareText;
};
