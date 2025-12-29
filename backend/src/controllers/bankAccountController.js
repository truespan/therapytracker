const Partner = require('../models/Partner');
const Organization = require('../models/Organization');

/**
 * Update bank account details for partner
 * PUT /api/partner/bank-account
 */
const updatePartnerBankAccount = async (req, res) => {
  try {
    const { id } = req.user;
    const { 
      bank_account_holder_name, 
      bank_account_number, 
      bank_ifsc_code, 
      bank_name 
    } = req.body;

    // Validation
    if (!bank_account_holder_name || !bank_account_number || !bank_ifsc_code) {
      return res.status(400).json({ 
        error: 'Bank account holder name, account number, and IFSC code are required' 
      });
    }

    // Validate IFSC format (11 characters: 4 letters + 0 + 6 alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(bank_ifsc_code.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid IFSC code format. Must be 11 characters (e.g., HDFC0001234)' 
      });
    }

    // Validate account number (digits only, 9-18 characters)
    const accountNumberRegex = /^\d{9,18}$/;
    if (!accountNumberRegex.test(bank_account_number)) {
      return res.status(400).json({ 
        error: 'Invalid account number. Must be 9-18 digits only' 
      });
    }

    // Update partner bank account
    // Note: bank_account_verified will be automatically set to FALSE by the model
    // when bank details change, so we don't need to pass it explicitly
    const updated = await Partner.update(id, {
      bank_account_holder_name: bank_account_holder_name.trim(),
      bank_account_number: bank_account_number.trim(),
      bank_ifsc_code: bank_ifsc_code.toUpperCase().trim(),
      bank_name: bank_name ? bank_name.trim() : null
    });

    // Mask account number for response
    const maskedAccountNumber = updated.bank_account_number 
      ? updated.bank_account_number.replace(/\d(?=\d{4})/g, '*')
      : null;

    res.json({
      success: true,
      message: 'Bank account details updated successfully. Pending verification.',
      data: {
        bank_account_holder_name: updated.bank_account_holder_name,
        bank_account_number: maskedAccountNumber,
        bank_ifsc_code: updated.bank_ifsc_code,
        bank_name: updated.bank_name,
        bank_account_verified: updated.bank_account_verified
      }
    });
  } catch (error) {
    console.error('Error updating partner bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account details', details: error.message });
  }
};

/**
 * Get bank account details for partner
 * GET /api/partner/bank-account
 */
const getPartnerBankAccount = async (req, res) => {
  try {
    const { id } = req.user;
    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Mask account number for security
    const maskedAccountNumber = partner.bank_account_number 
      ? partner.bank_account_number.replace(/\d(?=\d{4})/g, '*')
      : null;

    res.json({
      success: true,
      data: {
        bank_account_holder_name: partner.bank_account_holder_name,
        bank_account_number: maskedAccountNumber,
        bank_ifsc_code: partner.bank_ifsc_code,
        bank_name: partner.bank_name,
        bank_account_verified: partner.bank_account_verified || false,
        bank_account_verified_at: partner.bank_account_verified_at
      }
    });
  } catch (error) {
    console.error('Error fetching partner bank account:', error);
    res.status(500).json({ error: 'Failed to fetch bank account details', details: error.message });
  }
};

/**
 * Update bank account details for organization
 * PUT /api/organization/bank-account
 */
const updateOrganizationBankAccount = async (req, res) => {
  try {
    const { id } = req.user;
    const { 
      bank_account_holder_name, 
      bank_account_number, 
      bank_ifsc_code, 
      bank_name 
    } = req.body;

    // Validation
    if (!bank_account_holder_name || !bank_account_number || !bank_ifsc_code) {
      return res.status(400).json({ 
        error: 'Bank account holder name, account number, and IFSC code are required' 
      });
    }

    // Validate IFSC format (11 characters: 4 letters + 0 + 6 alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(bank_ifsc_code.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid IFSC code format. Must be 11 characters (e.g., HDFC0001234)' 
      });
    }

    // Validate account number (digits only, 9-18 characters)
    const accountNumberRegex = /^\d{9,18}$/;
    if (!accountNumberRegex.test(bank_account_number)) {
      return res.status(400).json({ 
        error: 'Invalid account number. Must be 9-18 digits only' 
      });
    }

    // Update organization bank account
    const updated = await Organization.update(id, {
      bank_account_holder_name: bank_account_holder_name.trim(),
      bank_account_number: bank_account_number.trim(),
      bank_ifsc_code: bank_ifsc_code.toUpperCase().trim(),
      bank_name: bank_name ? bank_name.trim() : null,
      bank_account_verified: false // Reset verification when details change
    });

    // Mask account number for response
    const maskedAccountNumber = updated.bank_account_number 
      ? updated.bank_account_number.replace(/\d(?=\d{4})/g, '*')
      : null;

    res.json({
      success: true,
      message: 'Bank account details updated successfully. Pending verification.',
      data: {
        bank_account_holder_name: updated.bank_account_holder_name,
        bank_account_number: maskedAccountNumber,
        bank_ifsc_code: updated.bank_ifsc_code,
        bank_name: updated.bank_name,
        bank_account_verified: updated.bank_account_verified
      }
    });
  } catch (error) {
    console.error('Error updating organization bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account details', details: error.message });
  }
};

/**
 * Get bank account details for organization
 * GET /api/organization/bank-account
 */
const getOrganizationBankAccount = async (req, res) => {
  try {
    const { id } = req.user;
    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Mask account number for security
    const maskedAccountNumber = organization.bank_account_number 
      ? organization.bank_account_number.replace(/\d(?=\d{4})/g, '*')
      : null;

    res.json({
      success: true,
      data: {
        bank_account_holder_name: organization.bank_account_holder_name,
        bank_account_number: maskedAccountNumber,
        bank_ifsc_code: organization.bank_ifsc_code,
        bank_name: organization.bank_name,
        bank_account_verified: organization.bank_account_verified || false,
        bank_account_verified_at: organization.bank_account_verified_at
      }
    });
  } catch (error) {
    console.error('Error fetching organization bank account:', error);
    res.status(500).json({ error: 'Failed to fetch bank account details', details: error.message });
  }
};

/**
 * Verify bank account (Admin only)
 * PUT /api/admin/bank-account/verify/:recipientType/:recipientId
 */
const verifyBankAccount = async (req, res) => {
  try {
    const { recipientType, recipientId } = req.params;

    if (!['partner', 'organization'].includes(recipientType)) {
      return res.status(400).json({ error: 'Invalid recipient type. Must be partner or organization' });
    }

    let recipient = null;
    if (recipientType === 'partner') {
      recipient = await Partner.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      if (!recipient.bank_account_number || !recipient.bank_ifsc_code) {
        return res.status(400).json({ error: 'Partner does not have bank account details' });
      }
      await Partner.update(recipientId, { bank_account_verified: true });
    } else {
      recipient = await Organization.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      if (!recipient.bank_account_number || !recipient.bank_ifsc_code) {
        return res.status(400).json({ error: 'Organization does not have bank account details' });
      }
      await Organization.update(recipientId, { bank_account_verified: true });
    }

    res.json({
      success: true,
      message: `Bank account verified successfully for ${recipientType} ${recipient.name}`
    });
  } catch (error) {
    console.error('Error verifying bank account:', error);
    res.status(500).json({ error: 'Failed to verify bank account', details: error.message });
  }
};

module.exports = {
  updatePartnerBankAccount,
  getPartnerBankAccount,
  updateOrganizationBankAccount,
  getOrganizationBankAccount,
  verifyBankAccount
};

