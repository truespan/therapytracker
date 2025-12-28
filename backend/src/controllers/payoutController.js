const Earnings = require('../models/Earnings');
const Payout = require('../models/Payout');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const RazorpayService = require('../services/razorpayService');
const db = require('../config/database');
const { formatDate } = require('../utils/dateUtils');

/**
 * Get payout candidates (partners and organizations with earnings)
 * GET /api/admin/payouts/candidates
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

        if (candidate.recipient_type === 'partner') {
          recipient = await Partner.findById(candidate.recipient_id);
          if (recipient) {
            name = recipient.name;
            email = recipient.email || '';
            contact = recipient.contact || '';
            razorpay_contact_id = recipient.razorpay_contact_id || null;
          }
        } else if (candidate.recipient_type === 'organization') {
          recipient = await Organization.findById(candidate.recipient_id);
          if (recipient) {
            name = recipient.name;
            email = recipient.email || '';
            contact = recipient.contact || '';
            razorpay_contact_id = recipient.razorpay_contact_id || null;
          }
        }

        return {
          id: candidate.recipient_id,
          type: candidate.recipient_type,
          name: name || 'Unknown',
          email,
          contact,
          razorpay_contact_id,
          available_balance: parseFloat(candidate.available_balance || 0),
          pending_earnings: parseFloat(candidate.pending_earnings || 0),
          withdrawn_amount: parseFloat(candidate.withdrawn_amount || 0),
          total_earnings: parseFloat(candidate.total_earnings || 0),
          eligible_for_payout: parseFloat(candidate.available_balance || 0) > 0
        };
      })
    );

    // Filter out any candidates where recipient was not found
    const validCandidates = candidates.filter(c => c.name !== 'Unknown');

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

      // Validate minimum payout amount (Razorpay minimum is typically 100 paise = 1 INR)
      const minimumAmount = 1; // 1 INR minimum
      if (availableBalance < minimumAmount) {
        errors.push({
          recipient_id: recipientId,
          recipient_type: recipientType,
          name: recipient.name,
          error: `Amount below minimum payout (${minimumAmount} INR)`
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

      // Convert amount to paise (multiply by 100)
      const amountInPaise = Math.round(availableBalance * 100);

      // Create Razorpay payout
      let razorpayPayout = null;
      try {
        const payoutData = {
          contact_id: contactId,
          amount: amountInPaise,
          currency: 'INR',
          mode: 'IMPS',
          purpose: 'payout',
          notes: {
            recipient_type: recipientType,
            recipient_id: recipientId.toString(),
            recipient_name: recipient.name,
            admin_notes: notes || ''
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
          amount: availableBalance,
          currency: 'INR',
          status: 'processing', // Will be updated by webhook
          payout_date: payoutDate,
          payment_method: 'IMPS',
          transaction_id: razorpayPayout.id,
          notes: notes || null,
          metadata: {
            razorpay_payout_id: razorpayPayout.id,
            razorpay_contact_id: contactId,
            created_by_admin: req.user.id
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
        amount: availableBalance,
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
          recipient_email: recipient ? recipient.email : null
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

