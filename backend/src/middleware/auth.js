const jwt = require('jsonwebtoken');
const Auth = require('../models/Auth');
const PartnerSubscription = require('../models/PartnerSubscription');

// Cache to track last update time per user to avoid too frequent DB writes
const lastUpdateCache = new Map();
const UPDATE_THROTTLE_MS = 5 * 60 * 1000; // Update at most once every 5 minutes

// Cache for subscription checks to avoid excessive DB queries
const subscriptionCheckCache = new Map();
const SUBSCRIPTION_CHECK_THROTTLE_MS = 1 * 60 * 1000; // Check at most once per minute

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    
    // For partners, check subscription validity (throttled)
    if (user.userType === 'partner') {
      const subCacheKey = `partner_sub_${user.id}`;
      const lastSubCheck = subscriptionCheckCache.get(subCacheKey);
      const now = Date.now();
      
      // Check subscription if it hasn't been checked recently
      if (!lastSubCheck || (now - lastSubCheck) > SUBSCRIPTION_CHECK_THROTTLE_MS) {
        try {
          const activeSub = await PartnerSubscription.getActiveSubscription(user.id);
          
          // If subscription is expired or invalid, block access
          if (!activeSub || !PartnerSubscription.isActive(activeSub)) {
            console.log(`[AUTH] Partner ${user.id} has expired subscription, blocking access`);
            return res.status(403).json({ 
              error: 'Your subscription has expired. Please log in again to renew or select a plan.',
              code: 'SUBSCRIPTION_EXPIRED',
              requiresRelogin: true
            });
          }
          
          // Update cache to indicate subscription was checked
          subscriptionCheckCache.set(subCacheKey, now);
        } catch (subError) {
          console.error('Error checking subscription in middleware:', subError);
          // On error, allow request to proceed (fail open) but log the error
        }
      }
      
      // Update last_login for partners when they use the system (throttled)
      const cacheKey = `partner_${user.id}`;
      const lastUpdate = lastUpdateCache.get(cacheKey);
      
      // Only update if it's been more than UPDATE_THROTTLE_MS since last update
      if (!lastUpdate || (now - lastUpdate) > UPDATE_THROTTLE_MS) {
        // Update asynchronously without blocking the request
        Auth.updateLastLogin('partner', user.id).catch(err => {
          console.error('Error updating last_login in middleware:', err);
        });
        lastUpdateCache.set(cacheKey, now);
      }
    }
    
    next();
  });
};

module.exports = { authenticateToken };

