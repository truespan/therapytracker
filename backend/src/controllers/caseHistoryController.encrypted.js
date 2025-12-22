const CaseHistory = require('../models/CaseHistory.encrypted');
const User = require('../models/User');
const auditService = require('../services/auditService');
const { CASE_HISTORY_SENSITIVE_FIELDS, AUDIT_OPERATIONS } = require('../utils/encryptionConstants');

/**
 * Enhanced Case History Controller with HIPAA/GDPR Encryption Support
 * Handles encryption/decryption of sensitive medical and psychological data
 */

class CaseHistoryController {
  /**
   * Get case history for a user (with automatic decryption)
   * GET /api/case-history/:userId/:partnerId
   */
  async getCaseHistory(req, res) {
    try {
      const { userId, partnerId } = req.params;
      const requestingUser = req.user;

      // Authorization check
      if (!this.canAccessCaseHistory(requestingUser, userId, partnerId)) {
        await auditService.logAuthorizationFailure(
          'read',
          'case_history',
          requestingUser,
          { recordId: null }
        );
        return res.status(403).json({ 
          error: 'Access denied. You do not have permission to view this case history.' 
        });
      }

      // Fetch case history with automatic decryption
      const caseHistory = await CaseHistory.findByUserIdAndPartnerId(
        parseInt(userId),
        parseInt(partnerId),
        { 
          includeDecrypted: true, 
          user: requestingUser 
        }
      );

      if (!caseHistory) {
        return res.status(404).json({ 
          error: 'Case history not found' 
        });
      }

      // Log successful access
      await auditService.logDataAccess(
        'read',
        'case_history',
        caseHistory.id,
        requestingUser,
        {
          reason: 'Clinical review of patient case history',
          fields: CASE_HISTORY_SENSITIVE_FIELDS,
          success: true
        }
      );

      res.json({
        success: true,
        data: caseHistory,
        encryption: {
          isEncrypted: !!caseHistory.encrypted_data,
          keyId: caseHistory.encryption_key_id,
          version: caseHistory.encryption_version
        }
      });

    } catch (error) {
      console.error('Error getting case history:', error);
      
      await auditService.logDataAccess(
        'read',
        'case_history',
        null,
        req.user,
        {
          reason: 'Failed to retrieve case history',
          error: error,
          success: false
        }
      );

      res.status(500).json({ 
        error: 'Failed to retrieve case history',
        details: error.message 
      });
    }
  }

  /**
   * Create or update case history (with automatic encryption)
   * POST /api/case-history
   */
  async saveCaseHistory(req, res) {
    try {
      const caseHistoryData = req.body;
      const requestingUser = req.user;

      // Validate required fields
      if (!caseHistoryData.user_id || !caseHistoryData.partner_id) {
        return res.status(400).json({ 
          error: 'User ID and Partner ID are required' 
        });
      }

      // Determine organization ID
      const organizationId = await this.getOrganizationId(requestingUser, caseHistoryData);
      if (!organizationId) {
        return res.status(400).json({ 
          error: 'Organization ID is required for encryption' 
        });
      }

      // Authorization check
      if (!this.canModifyCaseHistory(requestingUser, caseHistoryData.user_id, caseHistoryData.partner_id)) {
        await auditService.logAuthorizationFailure(
          'update',
          'case_history',
          requestingUser,
          { recordId: null }
        );
        return res.status(403).json({ 
          error: 'Access denied. You do not have permission to modify this case history.' 
        });
      }

      // Add organization ID to data
      caseHistoryData.organization_id = organizationId;

      // Save with automatic encryption
      const savedCaseHistory = await CaseHistory.createOrUpdate(caseHistoryData);

      // Log successful save
      await auditService.logDataAccess(
        'update',
        'case_history',
        savedCaseHistory.id,
        requestingUser,
        {
          reason: 'Clinical update of patient case history',
          fields: Object.keys(caseHistoryData),
          success: true
        }
      );

      res.json({
        success: true,
        message: 'Case history saved successfully',
        data: savedCaseHistory,
        encryption: {
          isEncrypted: !!savedCaseHistory.encrypted_data,
          keyId: savedCaseHistory.encryption_key_id,
          version: savedCaseHistory.encryption_version
        }
      });

    } catch (error) {
      console.error('Error saving case history:', error);
      
      await auditService.logDataAccess(
        'update',
        'case_history',
        null,
        req.user,
        {
          reason: 'Failed to save case history',
          error: error,
          success: false
        }
      );

      res.status(500).json({ 
        error: 'Failed to save case history',
        details: error.message 
      });
    }
  }

  /**
   * Search case histories by patient name (using blind index)
   * GET /api/case-history/search?name=:searchTerm
   */
  async searchByPatientName(req, res) {
    try {
      const { name } = req.query;
      const requestingUser = req.user;

      if (!name) {
        return res.status(400).json({ 
          error: 'Search term (name) is required' 
        });
      }

      const organizationId = requestingUser.organization_id;
      if (!organizationId) {
        return res.status(400).json({ 
          error: 'Organization ID is required for searching encrypted data' 
        });
      }

      // Search using blind index
      const results = await CaseHistory.searchByEncryptedField(
        'identification_name',
        name,
        organizationId
      );

      // Filter results based on user permissions
      const filteredResults = results.filter(record => 
        this.canAccessCaseHistory(requestingUser, record.user_id, record.partner_id)
      );

      // Log search operation
      await auditService.logDataAccess(
        'read',
        'case_history',
        null,
        requestingUser,
        {
          reason: `Search for patient by name: ${name}`,
          fields: ['identification_name'],
          success: true
        }
      );

      res.json({
        success: true,
        count: filteredResults.length,
        data: filteredResults
      });

    } catch (error) {
      console.error('Error searching case histories:', error);
      
      await auditService.logDataAccess(
        'read',
        'case_history',
        null,
        req.user,
        {
          reason: 'Failed to search case histories',
          error: error,
          success: false
        }
      );

      res.status(500).json({ 
        error: 'Failed to search case histories',
        details: error.message 
      });
    }
  }

  /**
   * Get encryption status for a case history
   * GET /api/case-history/:id/encryption-status
   */
  async getEncryptionStatus(req, res) {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      const status = await CaseHistory.getEncryptionStatus(id);

      if (!status) {
        return res.status(404).json({ 
          error: 'Case history not found' 
        });
      }

      // Authorization check
      if (!this.canAccessCaseHistory(requestingUser, status.user_id, status.partner_id)) {
        return res.status(403).json({ 
          error: 'Access denied' 
        });
      }

      res.json({
        success: true,
        encryptionStatus: status
      });

    } catch (error) {
      console.error('Error getting encryption status:', error);
      res.status(500).json({ 
        error: 'Failed to get encryption status',
        details: error.message 
      });
    }
  }

  /**
   * Re-encrypt case history with new key (for key rotation)
   * POST /api/case-history/:id/reencrypt
   */
  async reencryptCaseHistory(req, res) {
    try {
      const { id } = req.params;
      const { newKeyId } = req.body;
      const requestingUser = req.user;

      if (!newKeyId) {
        return res.status(400).json({ 
          error: 'New key ID is required' 
        });
      }

      // Authorization check - only admins can re-encrypt
      if (!this.canReencrypt(requestingUser)) {
        await auditService.logAuthorizationFailure(
          'key_management',
          'case_history',
          requestingUser,
          { recordId: id }
        );
        return res.status(403).json({ 
          error: 'Access denied. Only administrators can re-encrypt data.' 
        });
      }

      // Re-encrypt the case history
      const reencrypted = await CaseHistory.reencrypt(id, newKeyId);

      // Log key rotation
      await auditService.logKeyManagement(
        'rotate',
        newKeyId,
        'data',
        requestingUser,
        {
          version: reencrypted.encryption_version,
          success: true
        }
      );

      res.json({
        success: true,
        message: 'Case history re-encrypted successfully',
        data: reencrypted
      });

    } catch (error) {
      console.error('Error re-encrypting case history:', error);
      
      await auditService.logKeyManagement(
        'rotate',
        req.body.newKeyId,
        'data',
        req.user,
        {
          error: error,
          success: false
        }
      );

      res.status(500).json({ 
        error: 'Failed to re-encrypt case history',
        details: error.message 
      });
    }
  }

  /**
   * Bulk encrypt existing unencrypted case histories
   * POST /api/case-history/bulk-encrypt
   */
  async bulkEncryptCaseHistories(req, res) {
    try {
      const { organizationId, batchSize = 100 } = req.body;
      const requestingUser = req.user;

      // Authorization check - only admins can bulk encrypt
      if (!this.canReencrypt(requestingUser)) {
        return res.status(403).json({ 
          error: 'Access denied. Only administrators can perform bulk encryption.' 
        });
      }

      // Get unencrypted case histories
      const query = `
        SELECT id, user_id, partner_id 
        FROM case_histories 
        WHERE organization_id = $1 AND encrypted_data IS NULL
        LIMIT $2
      `;
      
      const result = await db.query(query, [organizationId, batchSize]);
      const unencryptedRecords = result.rows;

      if (unencryptedRecords.length === 0) {
        return res.json({
          success: true,
          message: 'No unencrypted case histories found',
          processed: 0
        });
      }

      // Get encryption key for the organization
      const encryptionKeyId = await CaseHistory.getEncryptionKey(organizationId);
      
      // Process each record
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const record of unencryptedRecords) {
        try {
          // Get full case history data
          const caseHistoryData = await CaseHistory.findByUserIdAndPartnerId(
            record.user_id,
            record.partner_id,
            { includeDecrypted: false }
          );

          if (caseHistoryData) {
            // Re-save with encryption
            await CaseHistory.createOrUpdate({
              ...caseHistoryData,
              organization_id: organizationId
            });
            
            successCount++;
          }
        } catch (error) {
          errorCount++;
          errors.push({
            recordId: record.id,
            error: error.message
          });
        }
      }

      // Log bulk encryption operation
      await auditService.logDataAccess(
        'update',
        'case_history',
        null,
        requestingUser,
        {
          reason: `Bulk encryption of ${unencryptedRecords.length} case histories`,
          success: true,
          details: {
            successCount,
            errorCount,
            organizationId
          }
        }
      );

      res.json({
        success: true,
        message: 'Bulk encryption completed',
        processed: unencryptedRecords.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Limit error details in response
      });

    } catch (error) {
      console.error('Error in bulk encryption:', error);
      
      res.status(500).json({ 
        error: 'Failed to perform bulk encryption',
        details: error.message 
      });
    }
  }

  // ====================
  // AUTHORIZATION HELPERS
  // ====================

  /**
   * Check if user can access case history
   * @private
   */
  canAccessCaseHistory(user, targetUserId, partnerId) {
    // Admin can access all
    if (user.role === 'admin') {
      return true;
    }
    
    // Partner can access their own patients
    if (user.role === 'partner' && user.id === partnerId) {
      return true;
    }
    
    // User can access their own case history
    if (user.role === 'user' && user.id === parseInt(targetUserId)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if user can modify case history
   * @private
   */
  canModifyCaseHistory(user, targetUserId, partnerId) {
    // Similar to canAccess but could have different rules
    return this.canAccessCaseHistory(user, targetUserId, partnerId);
  }

  /**
   * Check if user can re-encrypt data (key management)
   * @private
   */
  canReencrypt(user) {
    // Only admins can perform key management operations
    return user.role === 'admin';
  }

  /**
   * Get organization ID for the operation
   * @private
   */
  async getOrganizationId(user, caseHistoryData) {
    // If organization_id is provided in data, use it
    if (caseHistoryData.organization_id) {
      return caseHistoryData.organization_id;
    }
    
    // Otherwise, get from user
    if (user.organization_id) {
      return user.organization_id;
    }
    
    // Or fetch from database
    try {
      const query = 'SELECT organization_id FROM users WHERE id = $1';
      const result = await db.query(query, [caseHistoryData.user_id]);
      return result.rows[0]?.organization_id;
    } catch (error) {
      console.error('Error getting organization ID:', error.message);
      return null;
    }
  }
}

module.exports = new CaseHistoryController();