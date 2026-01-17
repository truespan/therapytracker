const Earnings = require('../models/Earnings');
const RazorpayService = require('../services/razorpayService');
const { getNextSaturday, formatDate } = require('../utils/dateUtils');

/**
 * Get earnings summary for the authenticated user (partner or organization)
 */
const getEarningsSummary = async (req, res) => {
  try {
    const user = req.user;
    let recipientId, recipientType;

    if (user.userType === 'partner') {
      recipientId = user.id;
      recipientType = 'partner';
    } else if (user.userType === 'organization') {
      recipientId = user.id;
      recipientType = 'organization';
    } else {
      return res.status(403).json({ error: 'Access denied. Only partners and organizations can view earnings.' });
    }

    const summary = await Earnings.getEarningsSummary(recipientId, recipientType);
    const sessionStats = await Earnings.getSessionStats(recipientId, recipientType);
    const revenueByMonth = await Earnings.getRevenueByMonth(recipientId, recipientType, 12);

    res.json({
      success: true,
      data: {
        available_balance: parseFloat(summary.available_balance || 0),
        withdrawn_amount: parseFloat(summary.withdrawn_amount || 0),
        total_earnings: parseFloat(summary.total_earnings || 0),
        upcoming_payout: parseFloat(summary.upcoming_payout || 0),
        pending_earnings: parseFloat(summary.pending_earnings || 0),
        completed_sessions: parseInt(sessionStats.completed_sessions || 0),
        cancellations_no_shows: parseInt(sessionStats.cancellations_no_shows || 0),
        revenue_by_month: revenueByMonth.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({ error: 'Failed to fetch earnings summary' });
  }
};

/**
 * Get detailed earnings list
 */
const getEarnings = async (req, res) => {
  try {
    const user = req.user;
    let recipientId, recipientType;

    if (user.userType === 'partner') {
      recipientId = user.id;
      recipientType = 'partner';
    } else if (user.userType === 'organization') {
      recipientId = user.id;
      recipientType = 'organization';
    } else {
      return res.status(403).json({ error: 'Access denied. Only partners and organizations can view earnings.' });
    }

    const filters = {
      status: req.query.status,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const earnings = await Earnings.getEarnings(recipientId, recipientType, filters);

    res.json({
      success: true,
      data: earnings.map(e => ({
        id: e.id,
        amount: parseFloat(e.amount),
        currency: e.currency,
        status: e.status,
        created_at: e.created_at,
        payout_date: e.payout_date,
        session_id: e.session_id,
        appointment_id: e.appointment_id
      }))
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

/**
 * Manual settlement sync - check pending earnings and update to available if settled
 * This endpoint can be called manually if webhooks are delayed or missed
 */
const syncSettlementStatus = async (req, res) => {
  try {
    const user = req.user;
    let recipientId, recipientType;

    if (user.userType === 'partner') {
      recipientId = user.id;
      recipientType = 'partner';
    } else if (user.userType === 'organization') {
      recipientId = user.id;
      recipientType = 'organization';
    } else {
      return res.status(403).json({ error: 'Access denied. Only partners and organizations can sync settlement status.' });
    }

    // Get all pending earnings for this recipient
    const pendingEarnings = await Earnings.getEarnings(recipientId, recipientType, {
      status: 'pending'
    });

    if (pendingEarnings.length === 0) {
      return res.json({
        success: true,
        message: 'No pending earnings to sync',
        synced: 0,
        skipped: 0,
        errors: 0
      });
    }

    console.log(`[EARNINGS SYNC] Starting manual settlement sync for ${recipientType} ${recipientId}. Found ${pendingEarnings.length} pending earnings.`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Check each pending earnings record against Razorpay
    for (const earnings of pendingEarnings) {
      if (!earnings.razorpay_payment_id) {
        console.log(`[EARNINGS SYNC] Skipping earnings ${earnings.id} - no payment ID`);
        skippedCount++;
        continue;
      }

      try {
        // Fetch payment status from Razorpay
        const payment = await RazorpayService.fetchPayment(earnings.razorpay_payment_id);
        
        // Check if payment is settled
        // Razorpay marks payments as settled when they've been transferred to the merchant account
        // Check for settlement status or transferred status
        const isSettled = payment.status === 'captured' && 
                         (payment.order_id && (payment.settled === 1 || payment.transfers?.length > 0));

        // Also check if payment has been transferred (which indicates settlement)
        const hasTransfers = payment.transfers && payment.transfers.length > 0;
        
        // Check if payment notes indicate settlement
        const settlementIndicators = [
          payment.status === 'captured',
          payment.settled === 1,
          hasTransfers,
          payment.notes?.settlement_status === 'settled'
        ];

        // If payment appears to be settled, update earnings status
        if (isSettled || hasTransfers || settlementIndicators.some(ind => ind === true)) {
          const nextSaturday = getNextSaturday();
          const payoutDate = formatDate(nextSaturday);
          
          await Earnings.updateStatusByPaymentId(earnings.razorpay_payment_id, 'available', payoutDate);
          
          console.log(`[EARNINGS SYNC] ✅ Updated earnings ${earnings.id} (payment ${earnings.razorpay_payment_id}) to 'available'`);
          syncedCount++;
        } else {
          console.log(`[EARNINGS SYNC] ⏳ Earnings ${earnings.id} (payment ${earnings.razorpay_payment_id}) still pending. Payment status: ${payment.status}, settled: ${payment.settled || 'N/A'}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`[EARNINGS SYNC] ❌ Error checking payment ${earnings.razorpay_payment_id}:`, error.message);
        errorCount++;
        errors.push({
          earnings_id: earnings.id,
          payment_id: earnings.razorpay_payment_id,
          error: error.message
        });
      }
    }

    console.log(`[EARNINGS SYNC] Sync complete. Synced: ${syncedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    res.json({
      success: true,
      message: `Settlement sync completed. ${syncedCount} earnings updated to 'available'`,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing settlement status:', error);
    res.status(500).json({ 
      error: 'Failed to sync settlement status',
      message: error.message 
    });
  }
};

module.exports = {
  getEarningsSummary,
  getEarnings,
  syncSettlementStatus
};

