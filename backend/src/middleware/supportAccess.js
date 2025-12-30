const Organization = require('../models/Organization');
const Partner = require('../models/Partner');

/**
 * Check if user is an app user (can request support)
 * App users: Partner OR (Organization with theraptrack_controlled = false)
 */
const checkAppUserAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userType = req.user.userType;
    const userId = req.user.id;

    // Admins cannot be app users
    if (userType === 'admin') {
      return res.status(403).json({
        error: 'Admins cannot request support. Use the support dashboard to respond to queries.'
      });
    }

    // Partners are always app users
    if (userType === 'partner') {
      return next();
    }

    // Organizations: only if theraptrack_controlled = false
    if (userType === 'organization') {
      const organization = await Organization.findById(userId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (organization.theraptrack_controlled === true) {
        return res.status(403).json({
          error: 'TheraPTrack controlled organizations cannot request support. Organizations with theraptrack_controlled = false can request support.'
        });
      }

      return next();
    }

    // Users (patients) cannot request support
    return res.status(403).json({
      error: 'Support chat is only available for Partners and non-TheraPTrack controlled Organizations.'
    });
  } catch (error) {
    console.error('Error checking app user access:', error);
    res.status(500).json({
      error: 'Failed to verify access',
      details: error.message
    });
  }
};

/**
 * Check if user is part of support team (can respond to queries)
 * Support team: Admin OR (Partner with query_resolver = true) OR (Organization with query_resolver = true)
 */
const checkSupportTeamAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userType = req.user.userType;
    const userId = req.user.id;

    // Admins are always part of support team
    if (userType === 'admin') {
      return next();
    }

    // Partners: check if query_resolver = true
    if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      if (partner.query_resolver !== true) {
        return res.status(403).json({
          error: 'Access denied. Only partners with query_resolver flag can access support dashboard.'
        });
      }

      return next();
    }

    // Organizations: check if query_resolver = true
    if (userType === 'organization') {
      const organization = await Organization.findById(userId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (organization.query_resolver !== true) {
        return res.status(403).json({
          error: 'Access denied. Only organizations with query_resolver flag can access support dashboard.'
        });
      }

      return next();
    }

    // Users (patients) cannot be support team
    return res.status(403).json({
      error: 'Access denied. Support dashboard is only available for Admins, Partners, and Organizations with query_resolver flag.'
    });
  } catch (error) {
    console.error('Error checking support team access:', error);
    res.status(500).json({
      error: 'Failed to verify access',
      details: error.message
    });
  }
};

module.exports = {
  checkAppUserAccess,
  checkSupportTeamAccess
};

