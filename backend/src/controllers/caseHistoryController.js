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
      // Normalize date fields - convert empty strings to null
      const normalizeDateField = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        return value;
      };

      // Normalize integer fields - convert empty strings to null
      const normalizeIntegerField = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        // If it's a string that can be parsed as a number, parse it
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = parseInt(value, 10);
          return isNaN(parsed) ? null : parsed;
        }
        // If it's already a number, return it
        if (typeof value === 'number') return value;
        return null;
      };

      // Normalize case history data
      const normalizedCaseHistory = { ...caseHistory };
      const dateFields = [
        'personal_history_birth_date',
        'menstrual_last_date',
        'marital_date_of_marriage'
      ];
      
      const integerFields = [
        'identification_age',
        'informant_age',
        'marital_age_at_marriage',
        'marital_partner_age_at_marriage'
      ];
      
      dateFields.forEach(field => {
        if (normalizedCaseHistory[field] !== undefined) {
          normalizedCaseHistory[field] = normalizeDateField(normalizedCaseHistory[field]);
        }
      });

      integerFields.forEach(field => {
        if (normalizedCaseHistory[field] !== undefined) {
          normalizedCaseHistory[field] = normalizeIntegerField(normalizedCaseHistory[field]);
        }
      });

      // Create or update case history
      const caseHistoryData = {
        ...normalizedCaseHistory,
        user_id: parseInt(userId),
        partner_id: partnerId
      };

      console.log('[CaseHistory Save] Chief complaints type:', typeof caseHistoryData.chief_complaints);
      console.log('[CaseHistory Save] Chief complaints value:', caseHistoryData.chief_complaints);

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

