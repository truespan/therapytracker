const db = require('../config/database');
const crypto = require('crypto');

/**
 * Audit Service for HIPAA & GDPR Compliance
 * Tracks all access to Protected Health Information (PHI) and sensitive data
 * Implements comprehensive audit logging for encryption operations and data access
 */

class AuditService {
  constructor() {
    this.auditQueue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // Flush every 5 seconds
    this.isFlushing = false;
    
    // Start automatic flush interval
    this.startAutoFlush();
  }

  /**
   * Log encryption operation
   * @param {string} operation - 'encrypt' or 'decrypt'
   * @param {string} dataType - Type of data (e.g., 'case_history', 'mental_status')
   * @param {number} recordId - Database record ID
   * @param {Object} user - User object with id, organization_id, etc.
   * @param {string} keyId - Encryption key identifier
   * @param {number} keyVersion - Key version used
   * @param {boolean} success - Whether operation succeeded
   * @param {Error} error - Error object if operation failed
   * @returns {Promise<void>}
   */
  async logEncryption(operation, dataType, recordId, user, keyId, keyVersion, success = true, error = null) {
    try {
      const auditRecord = {
        operation,
        data_type: dataType,
        record_id: recordId,
        organization_id: user?.organization_id || null,
        user_id: user?.id || null,
        user_role: user?.role || null,
        key_id: keyId,
        key_version: keyVersion,
        ip_address: user?.ipAddress || null,
        user_agent: user?.userAgent || null,
        success,
        error_message: error?.message || null,
        created_at: new Date()
      };

      // Add to queue for batch processing
      this.auditQueue.push(auditRecord);

      // Flush immediately if queue is full
      if (this.auditQueue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('Error logging encryption operation:', error.message);
      // Don't throw - audit failure shouldn't break the main operation
    }
  }

  /**
   * Log data access operation
   * @param {string} operation - 'create', 'read', 'update', 'delete'
   * @param {string} dataType - Type of data accessed
   * @param {number} recordId - Database record ID
   * @param {Object} user - User object
   * @param {Object} details - Additional details about the access
   * @returns {Promise<void>}
   */
  async logDataAccess(operation, dataType, recordId, user, details = {}) {
    try {
      const auditRecord = {
        operation,
        data_type: dataType,
        record_id: recordId,
        organization_id: user?.organization_id || null,
        user_id: user?.id || null,
        user_role: user?.role || null,
        ip_address: user?.ipAddress || null,
        user_agent: user?.userAgent || null,
        access_reason: details.reason || null,
        fields_accessed: details.fields || null,
        success: details.success !== false,
        error_message: details.error?.message || null,
        created_at: new Date()
      };

      this.auditQueue.push(auditRecord);

      if (this.auditQueue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('Error logging data access:', error.message);
    }
  }

  /**
   * Log key management operation
   * @param {string} operation - 'generate', 'rotate', 'retire', 'activate'
   * @param {string} keyId - Key identifier
   * @param {string} keyType - Type of key ('master', 'organization', 'data')
   * @param {Object} user - User who performed the operation
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logKeyManagement(operation, keyId, keyType, user, details = {}) {
    try {
      const auditRecord = {
        operation,
        data_type: 'key_management',
        record_id: null,
        organization_id: user?.organization_id || details.organizationId || null,
        user_id: user?.id || null,
        user_role: user?.role || null,
        key_id: keyId,
        key_version: details.version || null,
        ip_address: user?.ipAddress || null,
        user_agent: user?.userAgent || null,
        access_reason: `Key ${operation} operation`,
        fields_accessed: null,
        success: details.success !== false,
        error_message: details.error?.message || null,
        created_at: new Date()
      };

      this.auditQueue.push(auditRecord);

      if (this.auditQueue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('Error logging key management:', error.message);
    }
  }

  /**
   * Log authentication event
   * @param {string} operation - 'login', 'logout', 'failed_login'
   * @param {Object} user - User object (may be partial for failed logins)
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logAuthentication(operation, user, details = {}) {
    try {
      const auditRecord = {
        operation,
        data_type: 'authentication',
        record_id: null,
        organization_id: user?.organization_id || null,
        user_id: user?.id || null,
        user_role: user?.role || null,
        ip_address: details.ipAddress || null,
        user_agent: details.userAgent || null,
        access_reason: details.reason || null,
        fields_accessed: null,
        success: details.success !== false,
        error_message: details.error?.message || null,
        created_at: new Date()
      };

      this.auditQueue.push(auditRecord);

      if (this.auditQueue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('Error logging authentication:', error.message);
    }
  }

  /**
   * Log authorization failure
   * @param {string} attemptedOperation - Operation that was attempted
   * @param {string} dataType - Type of data
   * @param {Object} user - User who attempted the operation
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logAuthorizationFailure(attemptedOperation, dataType, user, details = {}) {
    try {
      const auditRecord = {
        operation: 'authorization_failure',
        data_type: dataType,
        record_id: details.recordId || null,
        organization_id: user?.organization_id || null,
        user_id: user?.id || null,
        user_role: user?.role || null,
        ip_address: user?.ipAddress || null,
        user_agent: user?.userAgent || null,
        access_reason: `Unauthorized attempt to ${attemptedOperation}`,
        fields_accessed: null,
        success: false,
        error_message: `User lacks permission to ${attemptedOperation} ${dataType}`,
        created_at: new Date()
      };

      this.auditQueue.push(auditRecord);

      if (this.auditQueue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('Error logging authorization failure:', error.message);
    }
  }

  /**
   * Flush audit queue to database
   * @returns {Promise<void>}
   */
  async flushQueue() {
    if (this.isFlushing || this.auditQueue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const recordsToFlush = [...this.auditQueue];
    this.auditQueue = [];

    try {
      const query = `
        INSERT INTO encryption_audit_log (
          operation, data_type, record_id, organization_id, user_id, user_role,
          key_id, key_version, ip_address, user_agent, access_reason,
          fields_accessed, success, error_message, created_at
        ) VALUES %L
      `;

      const values = recordsToFlush.map(record => [
        record.operation,
        record.data_type,
        record.record_id,
        record.organization_id,
        record.user_id,
        record.user_role,
        record.key_id,
        record.key_version,
        record.ip_address,
        record.user_agent,
        record.access_reason,
        record.fields_accessed,
        record.success,
        record.error_message,
        record.created_at
      ]);

      // Use parameterized query to prevent SQL injection
      const placeholders = values.map((_, index) => 
        `($${index * 14 + 1}, $${index * 14 + 2}, $${index * 14 + 3}, $${index * 14 + 4}, $${index * 14 + 5}, $${index * 14 + 6}, $${index * 14 + 7}, $${index * 14 + 8}, $${index * 14 + 9}, $${index * 14 + 10}, $${index * 14 + 11}, $${index * 14 + 12}, $${index * 14 + 13}, $${index * 14 + 14}, $${index * 14 + 15})`
      ).join(', ');

      const flatValues = values.flat();
      
      const insertQuery = `
        INSERT INTO encryption_audit_log (
          operation, data_type, record_id, organization_id, user_id, user_role,
          key_id, key_version, ip_address, user_agent, access_reason,
          fields_accessed, success, error_message, created_at
        ) VALUES ${placeholders}
      `;

      await db.query(insertQuery, flatValues);
    } catch (error) {
      console.error('Error flushing audit queue:', error.message);
      // Put records back in queue if flush fails
      this.auditQueue.unshift(...recordsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Start automatic flush interval
   */
  startAutoFlush() {
    setInterval(() => {
      if (this.auditQueue.length > 0) {
        this.flushQueue().catch(error => {
          console.error('Error in auto flush:', error.message);
        });
      }
    }, this.flushInterval);
  }

  /**
   * Get audit logs for a specific record
   * @param {string} dataType - Type of data
   * @param {number} recordId - Record ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  async getRecordAuditLogs(dataType, recordId, options = {}) {
    try {
      const { startDate, endDate, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT * FROM encryption_audit_log 
        WHERE data_type = $1 AND record_id = $2
      `;
      const values = [dataType, recordId];
      
      if (startDate) {
        query += ` AND created_at >= $${values.length + 1}`;
        values.push(startDate);
      }
      
      if (endDate) {
        query += ` AND created_at <= $${values.length + 1}`;
        values.push(endDate);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting record audit logs:', error.message);
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  async getUserAuditLogs(userId, options = {}) {
    try {
      const { startDate, endDate, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT * FROM encryption_audit_log 
        WHERE user_id = $1
      `;
      const values = [userId];
      
      if (startDate) {
        query += ` AND created_at >= $${values.length + 1}`;
        values.push(startDate);
      }
      
      if (endDate) {
        query += ` AND created_at <= $${values.length + 1}`;
        values.push(endDate);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting user audit logs:', error.message);
      throw new Error(`Failed to get user audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit logs for an organization (HIPAA compliance report)
   * @param {number} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  async getOrganizationAuditLogs(organizationId, options = {}) {
    try {
      const { startDate, endDate, limit = 1000, offset = 0 } = options;
      
      let query = `
        SELECT * FROM encryption_audit_log 
        WHERE organization_id = $1
      `;
      const values = [organizationId];
      
      if (startDate) {
        query += ` AND created_at >= $${values.length + 1}`;
        values.push(startDate);
      }
      
      if (endDate) {
        query += ` AND created_at <= $${values.length + 1}`;
        values.push(endDate);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting organization audit logs:', error.message);
      throw new Error(`Failed to get organization audit logs: ${error.message}`);
    }
  }

  /**
   * Generate HIPAA compliance report for an organization
   * @param {number} organizationId - Organization ID
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Promise<Object>} Compliance report
   */
  async generateHIPAAReport(organizationId, startDate, endDate) {
    try {
      const auditLogs = await this.getOrganizationAuditLogs(organizationId, {
        startDate,
        endDate,
        limit: 10000
      });

      // Analyze access patterns
      const accessStats = {
        totalAccesses: auditLogs.length,
        successfulAccesses: auditLogs.filter(log => log.success).length,
        failedAccesses: auditLogs.filter(log => !log.success).length,
        uniqueUsers: new Set(auditLogs.filter(log => log.user_id).map(log => log.user_id)).size,
        dataTypesAccessed: new Set(auditLogs.map(log => log.data_type)).size
      };

      // Group by operation type
      const operationsByType = auditLogs.reduce((acc, log) => {
        acc[log.operation] = (acc[log.operation] || 0) + 1;
        return acc;
      }, {});

      // Group by data type
      const accessesByDataType = auditLogs.reduce((acc, log) => {
        acc[log.data_type] = (acc[log.data_type] || 0) + 1;
        return acc;
      }, {});

      // Identify potential security concerns
      const securityConcerns = [];
      
      // Check for multiple failed access attempts
      const failedAccessByUser = auditLogs
        .filter(log => !log.success && log.user_id)
        .reduce((acc, log) => {
          acc[log.user_id] = (acc[log.user_id] || 0) + 1;
          return acc;
        }, {});

      for (const [userId, failedCount] of Object.entries(failedAccessByUser)) {
        if (failedCount > 5) {
          securityConcerns.push({
            type: 'EXCESSIVE_FAILED_ACCESS',
            userId: parseInt(userId),
            failedAttempts: failedCount,
            severity: 'MEDIUM'
          });
        }
      }

      // Check for after-hours access
      const afterHoursAccess = auditLogs.filter(log => {
        const hour = new Date(log.created_at).getHours();
        return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
      });

      if (afterHoursAccess.length > 0) {
        securityConcerns.push({
          type: 'AFTER_HOURS_ACCESS',
          count: afterHoursAccess.length,
          severity: 'LOW'
        });
      }

      return {
        reportPeriod: { startDate, endDate },
        accessStats,
        operationsByType,
        accessesByDataType,
        securityConcerns,
        rawLogs: auditLogs,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating HIPAA report:', error.message);
      throw new Error(`Failed to generate HIPAA report: ${error.message}`);
    }
  }

  /**
   * Anonymize IP address for privacy (GDPR compliance)
   * @param {string} ipAddress - Full IP address
   * @returns {string} Anonymized IP address
   */
  anonymizeIPAddress(ipAddress) {
    if (!ipAddress) return null;
    
    try {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        // IPv4 - anonymize last octet
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
      // IPv6 or other - return as is for now
      return ipAddress;
    } catch (error) {
      console.error('Error anonymizing IP address:', error.message);
      return ipAddress;
    }
  }

  /**
   * Clean up old audit logs (data retention policy)
   * @param {number} organizationId - Organization ID
   * @param {Date} retentionDate - Delete logs older than this date
   * @returns {Promise<number>} Number of records deleted
   */
  async cleanupOldLogs(organizationId, retentionDate) {
    try {
      const query = `
        DELETE FROM encryption_audit_log 
        WHERE organization_id = $1 AND created_at < $2
        RETURNING id
      `;
      
      const result = await db.query(query, [organizationId, retentionDate]);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up old logs:', error.message);
      throw new Error(`Failed to clean up old logs: ${error.message}`);
    }
  }
}

// Create singleton instance
const auditService = new AuditService();

// Ensure queue is flushed on process exit
process.on('exit', async () => {
  if (auditService.auditQueue.length > 0) {
    await auditService.flushQueue();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  if (auditService.auditQueue.length > 0) {
    await auditService.flushQueue();
  }
  process.exit(1);
});

module.exports = auditService;