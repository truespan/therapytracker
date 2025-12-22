const Organization = require('../models/Organization');
const Partner = require('../models/Partner');

/**
 * Check if WhatsApp messaging is enabled for a partner
 * This checks if the partner's organization has theraptrack_controlled set to true
 * @param {number} partnerId - Partner ID
 * @returns {Promise<Object>} Object with isEnabled flag and details
 */
const checkWhatsAppAccess = async (partnerId) => {
  try {
    // Get partner details to find organization
    const partner = await Partner.findById(partnerId);
    
    if (!partner) {
      return {
        isEnabled: false,
        reason: 'partner_not_found',
        message: 'Partner not found'
      };
    }

    // Check if organization is TheraPTrack controlled
    const isTheraPTrackControlled = await Organization.isTheraPTrackControlled(partner.organization_id);
    
    if (!isTheraPTrackControlled) {
      return {
        isEnabled: false,
        reason: 'organization_not_controlled',
        message: 'WhatsApp messaging is only available for TheraPTrack controlled organizations'
      };
    }

    return {
      isEnabled: true,
      reason: 'enabled',
      message: 'WhatsApp messaging is enabled'
    };
  } catch (error) {
    console.error('Error checking WhatsApp access:', error);
    throw error;
  }
};

/**
 * Middleware to check if WhatsApp messaging is enabled for the partner's organization
 * Should be used after authenticateToken and checkRole('partner')
 */
const checkWhatsAppAccessMiddleware = async (req, res, next) => {
  try {
    const partnerId = req.user.id;
    const accessCheck = await checkWhatsAppAccess(partnerId);

    if (!accessCheck.isEnabled) {
      return res.status(403).json({
        error: accessCheck.message,
        featureDisabled: true,
        reason: accessCheck.reason,
        message: 'WhatsApp messaging is only available for partners in TheraPTrack controlled organizations.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking WhatsApp access:', error);
    res.status(500).json({
      error: 'Failed to verify WhatsApp access',
      details: error.message
    });
  }
};

/**
 * Middleware for endpoints where partnerId is in route params
 * Used for endpoints like GET /partners/:partnerId/whatsapp/send
 */
const checkWhatsAppAccessByPartnerId = async (req, res, next) => {
  try {
    const partnerId = req.params.partnerId;

    if (!partnerId) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    const accessCheck = await checkWhatsAppAccess(partnerId);

    if (!accessCheck.isEnabled) {
      return res.status(403).json({
        error: accessCheck.message,
        featureDisabled: true,
        reason: accessCheck.reason
      });
    }

    next();
  } catch (error) {
    console.error('Error checking WhatsApp access:', error);
    res.status(500).json({
      error: 'Failed to verify WhatsApp access',
      details: error.message
    });
  }
};

module.exports = {
  checkWhatsAppAccessMiddleware,
  checkWhatsAppAccessByPartnerId,
  checkWhatsAppAccess
};