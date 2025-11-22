const Chart = require('../models/Chart');
const User = require('../models/User');
const Partner = require('../models/Partner');

const shareChart = async (req, res) => {
  try {
    const { partner_id, user_id, chart_type, selected_sessions } = req.body;

    if (!partner_id || !user_id || !chart_type) {
      return res.status(400).json({ 
        error: 'partner_id, user_id, and chart_type are required' 
      });
    }

    // Validate chart_type
    if (!['radar_default', 'comparison'].includes(chart_type)) {
      return res.status(400).json({ 
        error: 'chart_type must be either "radar_default" or "comparison"' 
      });
    }

    // Validate that comparison charts have selected_sessions
    if (chart_type === 'comparison' && (!selected_sessions || selected_sessions.length === 0)) {
      return res.status(400).json({ 
        error: 'selected_sessions is required for comparison charts' 
      });
    }

    // Verify user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify partner exists
    const partner = await Partner.findById(partner_id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const newChart = await Chart.create({
      partner_id,
      user_id,
      chart_type,
      selected_sessions: chart_type === 'comparison' ? selected_sessions : null
    });

    res.status(201).json({
      message: 'Chart shared successfully',
      chart: newChart
    });
  } catch (error) {
    console.error('Share chart error:', error);
    res.status(500).json({ error: 'Failed to share chart', details: error.message });
  }
};

const getUserCharts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const charts = await Chart.findByUserId(userId);
    res.json({ charts });
  } catch (error) {
    console.error('Get user charts error:', error);
    res.status(500).json({ error: 'Failed to fetch user charts', details: error.message });
  }
};

const getPartnerUserCharts = async (req, res) => {
  try {
    const { partnerId, userId } = req.params;

    // Verify partner exists
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const charts = await Chart.findByPartnerAndUser(partnerId, userId);
    res.json({ charts });
  } catch (error) {
    console.error('Get partner user charts error:', error);
    res.status(500).json({ error: 'Failed to fetch charts', details: error.message });
  }
};

const deleteChart = async (req, res) => {
  try {
    const { id } = req.params;

    const chart = await Chart.findById(id);
    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    await Chart.delete(id);

    res.json({
      message: 'Chart deleted successfully'
    });
  } catch (error) {
    console.error('Delete chart error:', error);
    res.status(500).json({ error: 'Failed to delete chart', details: error.message });
  }
};

module.exports = {
  shareChart,
  getUserCharts,
  getPartnerUserCharts,
  deleteChart
};

