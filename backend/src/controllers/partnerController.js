const Partner = require('../models/Partner');
const User = require('../models/User');
const ReportTemplate = require('../models/ReportTemplate');

const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // If partner has organization_id, get organization details
    if (partner.organization_id) {
      const Organization = require('../models/Organization');
      const organization = await Organization.findById(partner.organization_id);
      partner.organization = organization;

      const PartnerSubscription = require('../models/PartnerSubscription');
      
      // If organization is TheraPTrack controlled, get partner's individual subscription
      if (organization.theraptrack_controlled) {
        // First check if partner has any subscription (including paid plans)
        const partnerSubscriptions = await PartnerSubscription.findByPartnerId(id);
        
        if (partnerSubscriptions.length > 0) {
          // Partner has a subscription (could be Free Plan or a paid plan)
          partner.subscription = partnerSubscriptions[0];
        } else {
          // Partner doesn't have any subscription, create Free Plan
          partner.subscription = await PartnerSubscription.getOrCreateFreePlan(id);
        }
      } else {
        // For non-TheraPTrack controlled organizations, fetch the partner's assigned subscription
        const partnerSubscriptions = await PartnerSubscription.findByPartnerId(id);
        // Return the most recent subscription if available
        partner.subscription = partnerSubscriptions.length > 0 ? partnerSubscriptions[0] : null;
      }
    }

    res.json({ partner });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ error: 'Failed to fetch partner', details: error.message });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Update partner request:', { id, updates });

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this partner' });
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          error: 'Please provide a valid email address'
        });
      }
    }

    // Validate contact number format if provided
    if (updates.contact) {
      console.log('Validating contact:', updates.contact);
      const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
      if (!phoneRegex.test(updates.contact)) {
        console.log('Contact validation failed for:', updates.contact);
        return res.status(400).json({
          error: `Please provide a valid contact number with country code (e.g., +919876543210). Received: ${updates.contact}`
        });
      }
    }

    const updatedPartner = await Partner.update(id, updates);
    res.json({ 
      message: 'Partner updated successfully',
      partner: updatedPartner 
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({ error: 'Failed to update partner', details: error.message });
  }
};

const getPartnerUsers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this partner\'s users' });
    }

    const users = await Partner.getUsers(id);
    res.json({ users });
  } catch (error) {
    console.error('Get partner users error:', error);
    res.status(500).json({ error: 'Failed to fetch partner users', details: error.message });
  }
};

const getUserProfileForPartner = async (req, res) => {
  try {
    const { partnerId, userId } = req.params;

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(partnerId)) {
      return res.status(403).json({ error: 'Unauthorized to view this user\'s profile' });
    }

    // Verify user is assigned to this partner
    const users = await Partner.getUsers(partnerId);
    const isAssigned = users.some(u => u.id === parseInt(userId));

    if (!isAssigned) {
      return res.status(403).json({ error: 'User is not assigned to this partner' });
    }

    const user = await User.findById(userId);

    // Return user data
    // Note: The old profile_fields system has been removed
    // Use questionnaires for assessments instead
    res.json({
      user
    });
  } catch (error) {
    console.error('Get user profile for partner error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

/**
 * Set default report template for a partner
 */
const setDefaultReportTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { template_id } = req.body;

    // Check authorization - only the partner themselves can set their default template
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update this partner\'s settings' });
    }

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // If template_id is provided, verify it exists
    if (template_id) {
      const template = await ReportTemplate.findById(template_id);
      if (!template) {
        return res.status(404).json({ error: 'Report template not found' });
      }
    }

    // Set the default template
    const updatedPartner = await Partner.setDefaultReportTemplate(id, template_id || null);

    res.json({
      success: true,
      message: template_id ? 'Default report template set successfully' : 'Default report template removed',
      partner: updatedPartner
    });
  } catch (error) {
    console.error('Set default report template error:', error);
    res.status(500).json({
      error: 'Failed to set default report template',
      details: error.message
    });
  }
};

/**
 * Get default report template for a partner
 */
const getDefaultReportTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this partner\'s settings' });
    }

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Get partner with template details
    const partnerWithTemplate = await Partner.getDefaultReportTemplate(id);

    res.json({
      success: true,
      default_template_id: partnerWithTemplate.default_report_template_id,
      template: partnerWithTemplate.template_id ? {
        id: partnerWithTemplate.template_id,
        name: partnerWithTemplate.template_name,
        description: partnerWithTemplate.template_description
      } : null
    });
  } catch (error) {
    console.error('Get default report template error:', error);
    res.status(500).json({
      error: 'Failed to get default report template',
      details: error.message
    });
  }
};

/**
 * Get all available background images from assets folder
 */
const getAvailableBackgrounds = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const assetsDir = path.join(__dirname, '../../assets');

    // Read all files from assets directory
    const files = fs.readdirSync(assetsDir);

    // Filter only image files (jpg, jpeg, png)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext) && file.startsWith('report-background');
    });

    // Create response with file info
    const backgrounds = imageFiles.map(filename => ({
      filename,
      path: `/api/backgrounds/preview/${filename}`,
    }));

    res.json({
      success: true,
      backgrounds
    });
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    res.status(500).json({
      error: 'Failed to fetch background images',
      details: error.message
    });
  }
};

/**
 * Get preview image for a background
 */
const getBackgroundPreview = async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');

    // Security: only allow files starting with report-background
    if (!filename.startsWith('report-background')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../../assets', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Background image not found' });
    }

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    // Send image file
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving background preview:', error);
    res.status(500).json({
      error: 'Failed to load background image',
      details: error.message
    });
  }
};

/**
 * Set default report background for partner
 */
const setDefaultReportBackground = async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);
    const { background_filename } = req.body;

    // Verify partner ownership
    if (req.user.userType !== 'partner' || req.user.id !== partnerId) {
      return res.status(403).json({
        error: 'You can only set your own default background'
      });
    }

    // Validate background filename exists
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../assets', background_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({
        error: 'Selected background image does not exist'
      });
    }

    // Update partner's default background
    const updatedPartner = await Partner.setDefaultReportBackground(partnerId, background_filename);

    res.json({
      success: true,
      message: 'Default report background updated successfully',
      partner: updatedPartner
    });
  } catch (error) {
    console.error('Error setting default background:', error);
    res.status(500).json({
      error: 'Failed to set default background',
      details: error.message
    });
  }
};

/**
 * Get partner's default report background
 */
const getDefaultReportBackground = async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);

    // Verify partner ownership
    if (req.user.userType !== 'partner' || req.user.id !== partnerId) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const partner = await Partner.getDefaultReportBackground(partnerId);

    if (!partner) {
      return res.status(404).json({
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      default_background: partner.default_report_background || 'report-background.jpg'
    });
  } catch (error) {
    console.error('Error fetching default background:', error);
    res.status(500).json({
      error: 'Failed to fetch default background',
      details: error.message
    });
  }
};

/**
 * Cancel partner subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const partnerId = req.user.id; // Get partner ID from authenticated user
    const PartnerSubscription = require('../models/PartnerSubscription');
    const RazorpayService = require('../services/razorpayService');

    // Get the partner's current subscription
    const subscriptions = await PartnerSubscription.findByPartnerId(partnerId);
    
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const currentSubscription = subscriptions[0];

    // Check if subscription is already cancelled
    if (currentSubscription.is_cancelled) {
      return res.status(400).json({ error: 'Subscription is already cancelled' });
    }

    // Check if it's a paid subscription
    if (!currentSubscription.subscription_end_date) {
      return res.status(400).json({ error: 'Cannot cancel free subscription' });
    }

    // Cancel in Razorpay if razorpay_subscription_id exists
    if (currentSubscription.razorpay_subscription_id) {
      try {
        await RazorpayService.cancelSubscription(currentSubscription.razorpay_subscription_id, {
          cancel_at_cycle_end: 1 // Cancel at end of billing cycle
        });
      } catch (razorpayError) {
        console.error('Razorpay cancellation error:', razorpayError);
        // Continue with database cancellation even if Razorpay fails
      }
    }

    // Cancel in database
    const cancelledSubscription = await PartnerSubscription.cancelSubscription(currentSubscription.id);

    res.json({
      message: 'Subscription cancelled successfully. You will retain access until the end of your billing period.',
      subscription: cancelledSubscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      details: error.message
    });
  }
};

/**
 * Update fee settings for a partner
 */
const updateFeeSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { session_fee, booking_fee, fee_currency } = req.body;

    // Check authorization - only the partner themselves can update their fees
    if (req.user.userType === 'partner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update fee settings for this partner' });
    }

    // Validate that at least one fee field is provided
    if (session_fee === undefined && booking_fee === undefined && !fee_currency) {
      return res.status(400).json({ error: 'At least one fee field must be provided' });
    }

    // Validate fee values are non-negative
    if (session_fee !== undefined && session_fee !== null && session_fee < 0) {
      return res.status(400).json({ error: 'Session fee must be non-negative' });
    }

    if (booking_fee !== undefined && booking_fee !== null && booking_fee < 0) {
      return res.status(400).json({ error: 'Booking fee must be non-negative' });
    }

    // Validate currency code (basic validation)
    if (fee_currency && !/^[A-Z]{3}$/.test(fee_currency)) {
      return res.status(400).json({ error: 'Currency must be a valid 3-letter ISO code (e.g., INR, USD)' });
    }

    const updatedPartner = await Partner.updateFeeSettings(id, {
      session_fee,
      booking_fee,
      fee_currency
    });

    if (!updatedPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({
      message: 'Fee settings updated successfully',
      feeSettings: {
        session_fee: updatedPartner.session_fee,
        booking_fee: updatedPartner.booking_fee,
        fee_currency: updatedPartner.fee_currency
      }
    });
  } catch (error) {
    console.error('Update fee settings error:', error);
    res.status(500).json({
      error: 'Failed to update fee settings',
      details: error.message
    });
  }
};

/**
 * Get fee settings for a partner
 */
const getFeeSettings = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.getFeeSettings(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({
      feeSettings: {
        session_fee: partner.session_fee,
        booking_fee: partner.booking_fee,
        fee_currency: partner.fee_currency || 'INR'
      }
    });
  } catch (error) {
    console.error('Get fee settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch fee settings',
      details: error.message
    });
  }
};

module.exports = {
  getPartnerById,
  updatePartner,
  getPartnerUsers,
  getUserProfileForPartner,
  setDefaultReportTemplate,
  getDefaultReportTemplate,
  getAvailableBackgrounds,
  getBackgroundPreview,
  setDefaultReportBackground,
  getDefaultReportBackground,
  cancelSubscription,
  updateFeeSettings,
  getFeeSettings
};

