import ReactGA from 'react-ga4';

// Check if GA4 is enabled (measurement ID provided)
const isGA4Enabled = () => {
  return !!process.env.REACT_APP_GA_MEASUREMENT_ID;
};

// Hash function for anonymizing user IDs (simple hash, not cryptographic)
const hashUserId = (userId) => {
  if (!userId) return null;
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Initialize Google Analytics 4
 * Should be called once when the app starts
 */
export const initializeGA4 = () => {
  const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;
  
  if (!measurementId) {
    console.log('[GA4] Measurement ID not provided, analytics disabled');
    return false;
  }

  try {
    ReactGA.initialize(measurementId, {
      // Privacy-compliant configuration
      gtagOptions: {
        anonymize_ip: true, // Anonymize IP addresses
      },
    });
    console.log('[GA4] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[GA4] Initialization error:', error);
    return false;
  }
};

/**
 * Track a page view
 * @param {string} path - The path of the page
 * @param {string} title - Optional page title
 * @param {object} additionalData - Optional additional data (user_type, etc.)
 */
export const trackPageView = (path, title = null, additionalData = {}) => {
  if (!isGA4Enabled()) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
      ...additionalData,
    });
  } catch (error) {
    console.error('[GA4] Page view tracking error:', error);
  }
};

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} eventParams - Event parameters (category, action, label, value, etc.)
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (!isGA4Enabled()) return;

  try {
    ReactGA.event(eventName, eventParams);
  } catch (error) {
    console.error('[GA4] Event tracking error:', error);
  }
};

/**
 * Set user properties
 * @param {object} user - User object from auth context
 */
export const setUserProperties = (user) => {
  if (!isGA4Enabled() || !user) return;

  try {
    const properties = {
      user_type: user.userType || null,
      subscription_plan: user.subscription?.plan_name || null,
    };

    // Hash user ID for privacy
    if (user.id) {
      properties.user_id = hashUserId(user.id);
    }

    // Hash organization ID if applicable
    if (user.organization?.id) {
      properties.organization_id = hashUserId(user.organization.id);
    } else if (user.organization_id) {
      properties.organization_id = hashUserId(user.organization_id);
    }

    // Set user properties
    ReactGA.set({ userId: properties.user_id });
    ReactGA.set({ user_properties: properties });
  } catch (error) {
    console.error('[GA4] User properties error:', error);
  }
};

/**
 * Clear user properties (on logout)
 */
export const clearUserProperties = () => {
  if (!isGA4Enabled()) return;

  try {
    ReactGA.set({ userId: null });
    ReactGA.set({ user_properties: {} });
  } catch (error) {
    console.error('[GA4] Clear user properties error:', error);
  }
};

// Convenience functions for common events

/**
 * Track login event
 * @param {string} method - Login method ('email', 'google', etc.)
 */
export const trackLogin = (method = 'email') => {
  trackEvent('login', {
    method: method,
  });
};

/**
 * Track signup event
 * @param {string} userType - Type of user signing up
 */
export const trackSignup = (userType) => {
  trackEvent('signup', {
    user_type: userType,
  });
};

/**
 * Track logout event
 */
export const trackLogout = () => {
  trackEvent('logout');
  clearUserProperties();
};

/**
 * Track Google login event
 */
export const trackGoogleLogin = () => {
  trackLogin('google');
  trackEvent('google_login');
};

/**
 * Track subscription selection
 * @param {string} planName - Name of the selected plan
 * @param {number} planPrice - Price of the plan
 */
export const trackSubscriptionSelected = (planName, planPrice = null) => {
  trackEvent('subscription_selected', {
    plan_name: planName,
    value: planPrice,
    currency: 'USD',
  });
};

/**
 * Track subscription upgrade
 * @param {string} fromPlan - Previous plan name
 * @param {string} toPlan - New plan name
 */
export const trackSubscriptionUpgraded = (fromPlan, toPlan) => {
  trackEvent('subscription_upgraded', {
    from_plan: fromPlan,
    to_plan: toPlan,
  });
};

/**
 * Track subscription cancellation
 * @param {string} planName - Name of the cancelled plan
 */
export const trackSubscriptionCancelled = (planName) => {
  trackEvent('subscription_cancelled', {
    plan_name: planName,
  });
};

/**
 * Track subscription started
 * @param {string} planName - Name of the started plan
 */
export const trackSubscriptionStarted = (planName) => {
  trackEvent('subscription_started', {
    plan_name: planName,
  });
};

/**
 * Track terms acceptance
 */
export const trackTermsAccepted = () => {
  trackEvent('terms_accepted');
};

/**
 * Track email verification
 */
export const trackEmailVerified = () => {
  trackEvent('email_verified');
};

/**
 * Track password reset request
 */
export const trackPasswordResetRequested = () => {
  trackEvent('password_reset_requested');
};

/**
 * Track password reset completed
 */
export const trackPasswordResetCompleted = () => {
  trackEvent('password_reset_completed');
};

/**
 * Track dashboard view
 * @param {string} userType - Type of user viewing dashboard
 */
export const trackDashboardViewed = (userType) => {
  trackEvent('dashboard_viewed', {
    user_type: userType,
  });
};

