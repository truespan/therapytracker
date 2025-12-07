const CaseHistory = require('../models/CaseHistory');
const CaseHistoryFamilyMember = require('../models/CaseHistoryFamilyMember');
const db = require('../config/database');

// Get case history for a user
const getCaseHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id; // Partner ID from authenticated user

    // Verify that the partner has access to this user
    const assignmentCheck = await db.query(
      'SELECT * FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. User not assigned to this partner.' });
    }

    const caseHistory = await CaseHistory.findByUserIdAndPartnerId(userId, partnerId);
    
    if (!caseHistory) {
      return res.json({
        caseHistory: null,
        familyMembers: []
      });
    }

    const familyMembers = await CaseHistoryFamilyMember.findByCaseHistoryId(caseHistory.id);

    res.json({
      caseHistory,
      familyMembers
    });
  } catch (error) {
    console.error('Get case history error:', error);
    res.status(500).json({ error: 'Failed to fetch case history', details: error.message });
  }
};

// Create or update case history
const saveCaseHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id; // Partner ID from authenticated user
    const { caseHistory, familyMembers } = req.body;

    // Verify that the partner has access to this user
    const assignmentCheck = await db.query(
      'SELECT * FROM user_partner_assignments WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. User not assigned to this partner.' });
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Create or update case history
      const caseHistoryData = {
        ...caseHistory,
        user_id: parseInt(userId),
        partner_id: partnerId
      };

      const savedCaseHistory = await CaseHistory.createOrUpdate(caseHistoryData, client);

      // Delete existing family members
      await CaseHistoryFamilyMember.deleteByCaseHistoryId(savedCaseHistory.id, client);

      // Create new family members
      if (familyMembers && familyMembers.length > 0) {
        const familyMembersData = familyMembers.map(member => ({
          ...member,
          case_history_id: savedCaseHistory.id
        }));
        await CaseHistoryFamilyMember.createMultiple(familyMembersData, client);
      }

      // Fetch updated family members
      const updatedFamilyMembers = await CaseHistoryFamilyMember.findByCaseHistoryId(savedCaseHistory.id);

      return {
        caseHistory: savedCaseHistory,
        familyMembers: updatedFamilyMembers
      };
    });

    res.json({
      message: 'Case history saved successfully',
      ...result
    });
  } catch (error) {
    console.error('Save case history error:', error);
    res.status(500).json({ error: 'Failed to save case history', details: error.message });
  }
};

module.exports = {
  getCaseHistory,
  saveCaseHistory
};

