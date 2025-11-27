const Organization = require('../models/Organization');

/**
 * Middleware to check if video sessions are enabled for the partner's organization
 * Should be used after authenticateToken and checkRole('partner')
 */
const checkVideoSessionAccess = async (req, res, next) => {
  try {
    const partnerId = req.user.id;
    const isEnabled = await Organization.areVideoSessionsEnabledForPartner(partnerId);

    if (!isEnabled) {
      return res.status(403).json({
        error: 'Video sessions are not enabled for your organization',
        featureDisabled: true,
        message: 'This feature has been disabled by your organization administrator. Please contact support for more information.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking video session access:', error);
    res.status(500).json({
      error: 'Failed to verify feature access',
      details: error.message
    });
  }
};

/**
 * Middleware for GET endpoints where partnerId is in route params
 * Used for endpoints like GET /partners/:partnerId/video-sessions
 */
const checkVideoSessionAccessByPartnerId = async (req, res, next) => {
  try {
    const partnerId = req.params.partnerId;

    if (!partnerId) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    const isEnabled = await Organization.areVideoSessionsEnabledForPartner(partnerId);

    if (!isEnabled) {
      return res.status(403).json({
        error: 'Video sessions are not enabled for this organization',
        featureDisabled: true
      });
    }

    next();
  } catch (error) {
    console.error('Error checking video session access:', error);
    res.status(500).json({
      error: 'Failed to verify feature access',
      details: error.message
    });
  }
};

module.exports = {
  checkVideoSessionAccess,
  checkVideoSessionAccessByPartnerId
};
