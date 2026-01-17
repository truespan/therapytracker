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

    // Fetch recent settlements from Razorpay to check if payments are settled
    console.log(`[EARNINGS SYNC] Fetching recent settlements from Razorpay...`);
    
    try {
      // Fetch recent settlements (last 100)
      const settlementsResponse = await RazorpayService.fetchSettlements({ count: 100 });
      const settlements = settlementsResponse.items || [];
      
      console.log(`[EARNINGS SYNC] Found ${settlements.length} recent settlements`);
      
      // Build a map of payment ID -> settlement ID for quick lookup
      const paymentToSettlementMap = {};
      for (const settlement of settlements) {
        if (settlement.entity_ids && Array.isArray(settlement.entity_ids)) {
          for (const paymentId of settlement.entity_ids) {
            paymentToSettlementMap[paymentId] = settlement.id;
          }
        }
      }
      
      console.log(`[EARNINGS SYNC] Settlement map contains ${Object.keys(paymentToSettlementMap).length} payments`);
      
      // Check each pending earnings record
      for (const earnings of pendingEarnings) {
        if (!earnings.razorpay_payment_id) {
          console.log(`[EARNINGS SYNC] Skipping earnings ${earnings.id} - no payment ID`);
          skippedCount++;
          continue;
        }

        const paymentId = earnings.razorpay_payment_id;
        const settlementId = paymentToSettlementMap[paymentId];
        
        if (settlementId) {
          // Payment is in a settlement - update to available
          const nextSaturday = getNextSaturday();
          const payoutDate = formatDate(nextSaturday);
          
          await Earnings.updateStatusByPaymentId(paymentId, 'available', payoutDate, settlementId);
          
          console.log(`[EARNINGS SYNC] ✅ Updated earnings ${earnings.id} (payment ${paymentId}) to 'available' with settlement ${settlementId}`);
          syncedCount++;
        } else {
          // Payment not found in recent settlements - still pending
          console.log(`[EARNINGS SYNC] ⏳ Earnings ${earnings.id} (payment ${paymentId}) not found in recent settlements, still pending`);
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`[EARNINGS SYNC] ❌ Error fetching settlements:`, error.message);
      
      // Fallback: Check individual payments if settlement fetch fails
      console.log(`[EARNINGS SYNC] Falling back to individual payment checks...`);
      
      for (const earnings of pendingEarnings) {
        if (!earnings.razorpay_payment_id) {
          skippedCount++;
          continue;
        }

        try {
          const payment = await RazorpayService.fetchPayment(earnings.razorpay_payment_id);
          
          // Check if payment has settlement_id in its metadata
          if (payment.settlement_id) {
            const nextSaturday = getNextSaturday();
            const payoutDate = formatDate(nextSaturday);
            
            await Earnings.updateStatusByPaymentId(
              earnings.razorpay_payment_id, 
              'available', 
              payoutDate, 
              payment.settlement_id
            );
            
            console.log(`[EARNINGS SYNC] ✅ Updated earnings ${earnings.id} via payment check`);
            syncedCount++;
          } else {
            console.log(`[EARNINGS SYNC] ⏳ Payment ${earnings.razorpay_payment_id} not yet settled`);
            skippedCount++;
          }
        } catch (paymentError) {
          console.error(`[EARNINGS SYNC] ❌ Error checking payment ${earnings.razorpay_payment_id}:`, paymentError.message);
          errorCount++;
          errors.push({
            earnings_id: earnings.id,
            payment_id: earnings.razorpay_payment_id,
            error: paymentError.message
          });
        }
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

