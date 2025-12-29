const Earnings = require('../models/Earnings');
const Payout = require('../models/Payout');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const RazorpayService = require('../services/razorpayService');
const { calculatePayoutFee } = require('../services/transactionFeeService');
const db = require('../config/database');
const { formatDate } = require('../utils/dateUtils');

/**
 * Get payout candidates (partners and organizations with earnings)
 * GET /api/admin/payouts/candidates
 * 
 * Filters:
 * - Partners: Only those with theraptrack_controlled = TRUE
 * - Organizations: Only those with theraptrack_controlled = FALSE
 * - Both: Must have bank_account_verified = TRUE
 */
const getPayoutCandidates = async (req, res) => {
  try {
    // Get all recipients with earnings
    const earningsCandidates = await Earnings.getEarningsCandidates();

    // Fetch details for each candidate
    const candidates = await Promise.all(
      earningsCandidates.map(async (candidate) => {
        let recipient = null;
        let name = '';
        let email = '';
        let contact = '';
        let razorpay_contact_id = null;
        let theraptrack_controlled = null;
        let bank_account_verified = false;
        let bank_account_holder_name = null;
        let bank_account_number = null;
        let bank_ifsc_code = null;
        let bank_name = null;

        if (candidate.recipient_type === 'partner') {
          recipient = await Partner.findById(candidate.recipient_id);
          if (recipient) {
            name = recipient.name;
            email = recipient.email || '';
            contact = recipient.contact || '';
            razorpay_contact_id = recipient.razorpay_contact_id || null;
            bank_account_verified = recipient.bank_account_verified || false;
            bank_account_holder_name = recipient.bank_account_holder_name;
            bank_account_number = recipient.bank_account_number;
            bank_ifsc_code = recipient.bank_ifsc_code;
            bank_name = recipient.bank_name;
            
            // Get organization to check theraptrack_controlled
            if (recipient.organization_id) {
              const org = await Organization.findById(recipient.organization_id);
              theraptrack_controlled = org ? org.theraptrack_controlled : null;
            }
          }
        } else if (candidate.recipient_type === 'organization') {
          recipient = await Organization.findById(candidate.recipient_id);
          if (recipient) {
            name = recipient.name;
            email = recipient.email || '';
            contact = recipient.contact || '';
            razorpay_contact_id = recipient.razorpay_contact_id || null;
            theraptrack_controlled = recipient.theraptrack_controlled || false;
            bank_account_verified = recipient.bank_account_verified || false;
            bank_account_holder_name = recipient.bank_account_holder_name;
            bank_account_number = recipient.bank_account_number;
            bank_ifsc_code = recipient.bank_ifsc_code;
            bank_name = recipient.bank_name;
          }
        }

        const availableBalance = parseFloat(candidate.available_balance || 0);
        
        // Calculate fee breakdown
        const feeBreakdown = calculatePayoutFee(availableBalance, 'IMPS');
        
        // Mask account number for security
        const maskedAccountNumber = bank_account_number 
          ? bank_account_number.replace(/\d(?=\d{4})/g, '*')
          : null;

        return {
          id: candidate.recipient_id,
          type: candidate.recipient_type,
          name: name || 'Unknown',
          email,
          contact,
          razorpay_contact_id,
          available_balance: availableBalance,
          pending_earnings: parseFloat(candidate.pending_earnings || 0),
          withdrawn_amount: parseFloat(candidate.withdrawn_amount || 0),
          total_earnings: parseFloat(candidate.total_earnings || 0),
          theraptrack_controlled,
          bank_account_verified,
          bank_account_holder_name,
          bank_account_number: maskedAccountNumber,
          bank_ifsc_code,
          bank_name,
          fee_breakdown: feeBreakdown,
          net_amount: feeBreakdown.netAmount,
          eligible_for_payout: availableBalance > 0 && 
            ((candidate.recipient_type === 'partner' && theraptrack_controlled === true) ||
             (candidate.recipient_type === 'organization' && theraptrack_controlled === false)) &&
            bank_account_verified === true
        };
      })
    );

    // Filter candidates:
    // 1. Remove unknown recipients
    // 2. Partners: Only theraptrack_controlled = TRUE (show even if not verified)
    // 3. Organizations: Only theraptrack_controlled = FALSE (show even if not verified)
    // Note: bank_account_verified is used for eligibility, not filtering
    // This allows admins to see unverified accounts so they can verify them
    const validCandidates = candidates.filter(c => {
      if (c.name === 'Unknown') return false;
      
      if (c.type === 'partner') {
        return c.theraptrack_controlled === true;
      } else if (c.type === 'organization') {
        return c.theraptrack_controlled === false;
      }
      
      return false;
    });

    res.json({
      success: true,
      data: validCandidates
    });
  } catch (error) {
    console.error('Error fetching payout candidates:', error);
    res.status(500).json({ error: 'Failed to fetch payout candidates', details: error.message });
  }
};

/**
 * Create payouts for selected candidates
 * POST /api/admin/payouts/create
 */
const createPayout = async (req, res) => {
  const { recipient_ids, recipient_types, notes } = req.body;

  if (!recipient_ids || !recipient_types || !Array.isArray(recipient_ids) || !Array.isArray(recipient_types)) {
    return res.status(400).json({
      error: 'recipient_ids and recipient_types are required arrays'
    });
  }

  if (recipient_ids.length !== recipient_types.length) {
    return res.status(400).json({
      error: 'recipient_ids and recipient_types arrays must have the same length'
    });
  }

  if (recipient_ids.length === 0) {
    return res.status(400).json({
      error: 'At least one recipient must be selected'
    });
  }

  const results = [];
  const errors = [];

  // Process each recipient
  for (let i = 0; i < recipient_ids.length; i++) {
    const recipientId = recipient_ids[i];
    const recipientType = recipient_types[i];

    try {
      // Get recipient details
      let recipient = null;
      if (recipientType === 'partner') {
        recipient = await Partner.findById(recipientId);
      } else if (recipientType === 'organization') {
        recipient = await Organization.findById(recipientId);
      }

      if (!recipient) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          error: 'Recipient not found'
        });
        continue;
      }

      // Validate theraptrack_controlled flag
      if (recipientType === 'partner') {
        const org = await Organization.findById(recipient.organization_id);
        if (!org || !org.theraptrack_controlled) {
          errors.push({
            recipient_id: recipientId,
            recipient_type: recipientType,
            name: recipient.name,
            error: 'Partner must belong to a theraptrack_controlled organization'
          });
          continue;
        }
      } else if (recipientType === 'organization') {
        if (!recipient.theraptrack_controlled) {
          errors.push({
            recipient_id: recipientId,
            recipient_type: recipientType,
            name: recipient.name,
            error: 'Organization must have theraptrack_controlled = false'
          });
          continue;
        }
      }

      // Validate bank account exists and is verified
      if (!recipient.bank_account_number || !recipient.bank_ifsc_code) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: 'Bank account details not provided'
        });
        continue;
      }

      if (!recipient.bank_account_verified) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: 'Bank account not verified'
        });
        continue;
      }

      // Get available earnings
      const earningsSummary = await Earnings.getEarningsSummary(recipientId, recipientType);
      const availableBalance = parseFloat(earningsSummary.available_balance || 0);

      if (availableBalance <= 0) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: 'No available balance for payout'
        });
        continue;
      }

      // Calculate transaction fees
      const paymentMethod = 'IMPS';
      const feeBreakdown = calculatePayoutFee(availableBalance, paymentMethod);
      const netAmount = feeBreakdown.netAmount;

      // Validate minimum payout amount after fees (Razorpay minimum is typically 100 paise = 1 INR)
      const minimumAmount = 1; // 1 INR minimum
      if (netAmount < minimumAmount) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: `Net amount after fees (${netAmount.toFixed(2)} INR) below minimum payout (${minimumAmount} INR)`
        });
        continue;
      }

      // Get or create Razorpay contact
      let contactId = recipient.razorpay_contact_id;

      if (!contactId) {
        try {
          // Create contact in Razorpay
          const contactData = {
            name: recipient.name,
            email: recipient.email || undefined,
            contact: recipient.contact || undefined,
            type: 'vendor',
            notes: {
              recipient_type: recipientType,
              recipient_id: recipientId.toString()
            }
          };

          const razorpayContact = await RazorpayService.createContact(contactData);
          contactId = razorpayContact.id;

          // Save contact ID to database
          if (recipientType === 'partner') {
            await Partner.updateRazorpayContactId(recipientId, contactId);
          } else {
            await Organization.updateRazorpayContactId(recipientId, contactId);
          }
        } catch (contactError) {
          console.error(`Failed to create Razorpay contact for ${recipientType} ${recipientId}:`, contactError);
          errors.push({
            recipient_id: recipientId,
            recipient_type: recipientType,
            name: recipient.name,
            error: `Failed to create Razorpay contact: ${contactError.message}`
          });
          continue;
        }
      }

      // Convert net amount to paise (multiply by 100)
      const netAmountInPaise = Math.round(netAmount * 100);

      // Create Razorpay payout with net amount (after fees)
      let razorpayPayout = null;
      try {
        const payoutData = {
          contact_id: contactId,
          account_number: recipient.bank_account_number,
          ifsc: recipient.bank_ifsc_code,
          account_holder_name: recipient.bank_account_holder_name,
          amount: netAmountInPaise,
          currency: 'INR',
          mode: paymentMethod,
          purpose: 'payout',
          notes: {
            recipient_type: recipientType,
            recipient_id: recipientId.toString(),
            recipient_name: recipient.name,
            admin_notes: notes || '',
            gross_amount: availableBalance.toFixed(2),
            transaction_fee: feeBreakdown.baseFee.toFixed(2),
            gst_on_fee: feeBreakdown.gstAmount.toFixed(2),
            net_amount: netAmount.toFixed(2)
          }
        };

        razorpayPayout = await RazorpayService.createPayout(payoutData);
      } catch (payoutError) {
        console.error(`Failed to create Razorpay payout for ${recipientType} ${recipientId}:`, payoutError);
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: `Failed to create Razorpay payout: ${payoutError.message}`
        });
        continue;
      }

      // Create payout record in database
      const payoutDate = formatDate(new Date());
      let payoutRecord = null;

      try {
        payoutRecord = await Payout.create({
          recipient_id: recipientId,
          recipient_type: recipientType,
          amount: netAmount, // Store net amount as the main amount
          currency: 'INR',
          status: 'processing', // Will be updated by webhook
          payout_date: payoutDate,
          payment_method: paymentMethod,
          transaction_id: razorpayPayout.id,
          notes: notes || null,
          transaction_fee: feeBreakdown.baseFee,
          gst_on_fee: feeBreakdown.gstAmount,
          net_amount: netAmount,
          gross_amount: availableBalance,
          metadata: {
            razorpay_payout_id: razorpayPayout.id,
            razorpay_contact_id: contactId,
            created_by_admin: req.user.id,
            fee_breakdown: feeBreakdown
          }
        });
      } catch (dbError) {
        console.error(`Failed to create payout record for ${recipientType} ${recipientId}:`, dbError);
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: `Failed to save payout record: ${dbError.message}`
        });
        continue;
      }

      // Link earnings to payout
      try {
        const availableEarnings = await Earnings.getAvailableEarnings(recipientId, recipientType);
        const earningsIds = availableEarnings.map(e => e.id);

        if (earningsIds.length > 0) {
          await Earnings.updatePayoutForEarnings(earningsIds, payoutRecord.id, payoutDate);

          // Update earnings status to 'withdrawn' (assuming payout will succeed)
          // In production, you might want to keep as 'available' until webhook confirms
          const updateQuery = `
            UPDATE earnings
            SET status = 'withdrawn',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::int[])
          `;
          await db.query(updateQuery, [earningsIds]);
        }
      } catch (earningsError) {
        console.error(`Failed to link earnings for ${recipientType} ${recipientId}:`, earningsError);
        // Don't fail the payout, just log the error
      }

      results.push({
        recipient_id: recipientId,
        recipient_type: recipientType,
        name: recipient.name,
        gross_amount: availableBalance,
        transaction_fee: feeBreakdown.baseFee,
        gst_on_fee: feeBreakdown.gstAmount,
        net_amount: netAmount,
        amount: netAmount, // For backward compatibility
        payout_id: payoutRecord.id,
        razorpay_payout_id: razorpayPayout.id,
        status: 'processing'
      });
    } catch (error) {
      console.error(`Error processing payout for recipient ${recipientId} (${recipientType}):`, error);
      errors.push({
        recipient_id: recipientId,
        recipient_type: recipientType,
        error: error.message || 'Unknown error'
      });
    }
  }

  res.json({
    success: true,
    data: {
      created: results,
      errors: errors.length > 0 ? errors : undefined
    },
    message: `Successfully created ${results.length} payout(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
  });
};

/**
 * Get payout history
 * GET /api/admin/payouts
 */
const getPayoutHistory = async (req, res) => {
  try {
    const { status, start_date, end_date, limit = 100 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (start_date) filters.startDate = start_date;
    if (end_date) filters.endDate = end_date;
    if (limit) filters.limit = parseInt(limit);

    // Get all payouts (admin can see all)
    let query = 'SELECT * FROM payouts WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND payout_date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND payout_date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ` ORDER BY payout_date DESC, created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await db.query(query, values);
    const payouts = result.rows;

    // Enrich with recipient details
    const enrichedPayouts = await Promise.all(
      payouts.map(async (payout) => {
        let recipient = null;
        if (payout.recipient_type === 'partner') {
          recipient = await Partner.findById(payout.recipient_id);
        } else if (payout.recipient_type === 'organization') {
          recipient = await Organization.findById(payout.recipient_id);
        }

        return {
          ...payout,
          recipient_name: recipient ? recipient.name : 'Unknown',
          recipient_email: recipient ? recipient.email : null,
          transaction_fee: parseFloat(payout.transaction_fee || 0),
          gst_on_fee: parseFloat(payout.gst_on_fee || 0),
          net_amount: parseFloat(payout.net_amount || payout.amount || 0),
          gross_amount: parseFloat(payout.gross_amount || payout.amount || 0)
        };
      })
    );

    res.json({
      success: true,
      data: enrichedPayouts
    });
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ error: 'Failed to fetch payout history', details: error.message });
  }
};

module.exports = {
  getPayoutCandidates,
  createPayout,
  getPayoutHistory
};

