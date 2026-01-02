const jwt = require('jsonwebtoken');
const Auth = require('../models/Auth');

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
    
    // Update last_login for partners when they use the system (throttled)
    if (user.userType === 'partner') {
      const cacheKey = `partner_${user.id}`;
      const lastUpdate = lastUpdateCache.get(cacheKey);
      const now = Date.now();
      
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

