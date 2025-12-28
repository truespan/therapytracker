const MentalStatusExamination = require('../models/MentalStatusExamination');
const db = require('../config/database');

// Fetch saved MSE data for a user/partner pair
const getMentalStatus = async (req, res) => {
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

    const mentalStatus = await MentalStatusExamination.findByUserIdAndPartnerId(userId, partnerId);

    return res.json({ mentalStatus: mentalStatus || null });
  } catch (error) {
    console.error('Get mental status examination error:', error);
    return res.status(500).json({ error: 'Failed to fetch mental status examination', details: error.message });
  }
};

// Create or update MSE data for a user/partner pair
const saveMentalStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id;
    const { mentalStatus } = req.body || {};

    if (!mentalStatus) {
      return res.status(400).json({ error: 'Mental status examination data is required' });
    }

    // Ensure the partner is assigned to this user
    const assignment = await db.query(
      'SELECT 1 FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );

    if (assignment.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. User not assigned to this partner.' });
    }

    const payload = MentalStatusExamination.buildPayload(mentalStatus, userId, partnerId);
    const saved = await MentalStatusExamination.saveOrUpdate(payload);

    return res.json({
      message: 'Mental status examination saved successfully',
      mentalStatus: saved
    });
  } catch (error) {
    console.error('Save mental status examination error:', error);
    return res.status(500).json({ error: 'Failed to save mental status examination', details: error.message });
  }
};

module.exports = {
  getMentalStatus,
  saveMentalStatus
};






















