const PlanOfAssessment = require('../models/PlanOfAssessment');
const db = require('../config/database');

// Fetch saved plan of assessment data for a user/partner pair
const getPlanOfAssessment = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id;

    // Ensure the partner is assigned to this user
    const assignment = await db.query(
      'SELECT 1 FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );

    if (assignment.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. User not assigned to this partner.' });
    }

    const planOfAssessment = await PlanOfAssessment.findByUserIdAndPartnerId(userId, partnerId);

    return res.json({ planOfAssessment: planOfAssessment || null });
  } catch (error) {
    console.error('Get plan of assessment error:', error);
    return res.status(500).json({ error: 'Failed to fetch plan of assessment', details: error.message });
  }
};

// Create or update plan of assessment data for a user/partner pair
const savePlanOfAssessment = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id;
    const { planOfAssessment } = req.body || {};

    if (!planOfAssessment) {
      return res.status(400).json({ error: 'Plan of assessment data is required' });
    }

    // Ensure the partner is assigned to this user
    const assignment = await db.query(
      'SELECT 1 FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );

    if (assignment.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. User not assigned to this partner.' });
    }

    const payload = PlanOfAssessment.buildPayload(planOfAssessment, userId, partnerId);
    const saved = await PlanOfAssessment.saveOrUpdate(payload);

    return res.json({
      message: 'Plan of assessment saved successfully',
      planOfAssessment: saved
    });
  } catch (error) {
    console.error('Save plan of assessment error:', error);
    return res.status(500).json({ error: 'Failed to save plan of assessment', details: error.message });
  }
};

module.exports = {
  getPlanOfAssessment,
  savePlanOfAssessment
};

