const jwt = require('jsonwebtoken');
const Auth = require('../models/Auth');
const PartnerSubscription = require('../models/PartnerSubscription');

// Cache to track last update time per user to avoid too frequent DB writes
const lastUpdateCache = new Map();
const UPDATE_THROTTLE_MS = 5 * 60 * 1000; // Update at most once every 5 minutes

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
    
    // For partners, check subscription validity on EVERY request (no caching)
    // This ensures expired trials are immediately blocked
    if (user.userType === 'partner') {
      try {
        const activeSub = await PartnerSubscription.getActiveSubscription(user.id);
        
        // If subscription is expired or invalid, block access
        if (!activeSub || !PartnerSubscription.isActive(activeSub)) {
          console.log(`[AUTH] Partner ${user.id} has expired/invalid subscription, blocking access`);
          return res.status(403).json({
            error: 'Your subscription has expired. Please log in again to renew or select a plan.',
            code: 'SUBSCRIPTION_EXPIRED',
            requiresRelogin: true
          });
        }
      } catch (subError) {
        console.error('Error checking subscription in middleware:', subError);
        // On error, block access (fail closed) for security
        return res.status(500).json({
          error: 'Unable to verify subscription status. Please try again.',
          code: 'SUBSCRIPTION_CHECK_ERROR'
        });
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

