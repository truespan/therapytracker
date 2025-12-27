const Earnings = require('../models/Earnings');

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
        pending_held_earnings: parseFloat(summary.pending_held_earnings || 0),
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

module.exports = {
  getEarningsSummary,
  getEarnings
};

