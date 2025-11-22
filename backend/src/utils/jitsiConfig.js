// Jitsi configuration and helper utilities
// For JaaS (Jitsi as a Service), you'll need to configure your app ID and domain

const JITSI_CONFIG = {
  // For JaaS, use your custom domain (e.g., 8x8.vc or your custom domain)
  // For self-hosted or free Jitsi Meet, use meet.jit.si
  domain: process.env.JITSI_DOMAIN || 'meet.jit.si',
  
  // JaaS App ID (if using JaaS with authentication)
  appId: process.env.JITSI_APP_ID || '',
  
  // Default configuration options
  options: {
    roomName: '',
    width: '100%',
    height: '100%',
    parentNode: null,
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      prejoinPageEnabled: true,
      disableDeepLinking: true
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
        'recording',
        'livestreaming',
        'etherpad',
        'sharedvideo',
        'settings',
        'raisehand',
        'videoquality',
        'filmstrip',
        'feedback',
        'stats',
        'shortcuts',
        'tileview',
        'download',
        'help',
        'mute-everyone'
      ]
    }
  }
};

/**
 * Generate Jitsi meeting URL
 * @param {string} meetingRoomId - Unique meeting room identifier
 * @param {string} domain - Jitsi domain (optional, uses default if not provided)
 * @returns {string} Full Jitsi meeting URL
 */
function generateMeetingUrl(meetingRoomId, domain = null) {
  const jitsiDomain = domain || JITSI_CONFIG.domain;
  return `https://${jitsiDomain}/${meetingRoomId}`;
}

/**
 * Generate Jitsi iframe embed URL
 * @param {string} meetingRoomId - Unique meeting room identifier
 * @param {object} options - Additional options (displayName, email, etc.)
 * @returns {string} Jitsi iframe embed URL
 */
function generateIframeUrl(meetingRoomId, options = {}) {
  const jitsiDomain = JITSI_CONFIG.domain;
  let url = `https://${jitsiDomain}/${meetingRoomId}`;
  
  const params = [];
  
  if (options.displayName) {
    params.push(`userInfo.displayName=${encodeURIComponent(options.displayName)}`);
  }
  
  if (options.email) {
    params.push(`userInfo.email=${encodeURIComponent(options.email)}`);
  }
  
  // Add JWT token if using JaaS with authentication
  if (options.jwt) {
    params.push(`jwt=${options.jwt}`);
  }
  
  if (params.length > 0) {
    url += `#${params.join('&')}`;
  }
  
  return url;
}

/**
 * Get Jitsi configuration for frontend
 * @returns {object} Jitsi configuration object
 */
function getJitsiConfig() {
  return {
    domain: JITSI_CONFIG.domain,
    appId: JITSI_CONFIG.appId,
    options: JITSI_CONFIG.options
  };
}

module.exports = {
  JITSI_CONFIG,
  generateMeetingUrl,
  generateIframeUrl,
  getJitsiConfig
};

