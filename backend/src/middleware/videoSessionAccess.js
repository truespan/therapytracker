const Organization = require('../models/Organization');
const Partner = require('../models/Partner');

/**
 * Check if video sessions are enabled for a partner
 * This checks both organization-level and partner-level settings
 * For theraptrack-controlled organizations, both must be enabled
 * For non-theraptrack organizations, only organization-level matters
 * @param {number} partnerId - Partner ID
 * @returns {Promise<Object>} Object with isEnabled flag and details
 */
const checkVideoSessionsEnabled = async (partnerId) => {
  try {
    // Get organization video session status
    const orgEnabled = await Organization.areVideoSessionsEnabledForPartner(partnerId);
    
    if (!orgEnabled) {
      return {
        isEnabled: false,
        reason: 'organization_disabled',
        message: 'Video sessions are not enabled for your organization'
      };
    }

    // Get partner video session status
    const partnerEnabled = await Partner.areVideoSessionsEnabled(partnerId);
    
    if (!partnerEnabled) {
      return {
        isEnabled: false,
        reason: 'therapist_disabled',
        message: 'Video sessions are not enabled for your account. Please contact your organization administrator.'
      };
    }

    return {
      isEnabled: true,
      reason: 'enabled',
      message: 'Video sessions are enabled'
    };
  } catch (error) {
    console.error('Error checking video session access:', error);
    throw error;
  }
};

/**
 * Middleware to check if video sessions are enabled for the partner's organization and therapist
 * Should be used after authenticateToken and checkRole('partner')
 */
const checkVideoSessionAccess = async (req, res, next) => {
  try {
    const partnerId = req.user.id;
    const accessCheck = await checkVideoSessionsEnabled(partnerId);

    if (!accessCheck.isEnabled) {
      return res.status(403).json({
        error: accessCheck.message,
        featureDisabled: true,
        reason: accessCheck.reason,
        message: accessCheck.reason === 'organization_disabled'
          ? 'This feature has been disabled by your organization administrator. Please contact support for more information.'
          : 'Your organization administrator has disabled video sessions for your account. Please contact them for more information.'
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

    const accessCheck = await checkVideoSessionsEnabled(partnerId);

    if (!accessCheck.isEnabled) {
      return res.status(403).json({
        error: accessCheck.message,
        featureDisabled: true,
        reason: accessCheck.reason
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
  checkVideoSessionAccessByPartnerId,
  checkVideoSessionsEnabled
};
