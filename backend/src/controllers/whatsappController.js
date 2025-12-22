const whatsappService = require('../services/whatsappService');
const db = require('../config/database');

/**
 * Get WhatsApp service status
 */
const getWhatsAppStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    
    // Get notification statistics
    const statsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count
      FROM whatsapp_notifications
      GROUP BY status
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows.reduce((acc, row) => {
      acc[row.status] = {
        total: parseInt(row.count),
        today: parseInt(row.today_count),
        week: parseInt(row.week_count)
      };
      return acc;
    }, {});

    res.json({
      success: true,
      service: status,
      statistics: stats,
      message: status.enabled ? 'WhatsApp service is enabled and configured' : 'WhatsApp service is disabled or not configured'
    });
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status',
      details: error.message
    });
  }
};

/**
 * Test WhatsApp integration
 */
const testWhatsAppIntegration = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await whatsappService.testIntegration(phoneNumber);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test message sent successfully',
        messageSid: result.messageSid,
        status: result.status,
        phoneNumber: result.phoneNumber
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Test WhatsApp integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test WhatsApp integration',
      details: error.message
    });
  }
};

/**
 * Get WhatsApp notification logs
 */
const getWhatsAppLogs = async (req, res) => {
  try {
    const { 
      userId, 
      appointmentId, 
      status, 
      limit = 50, 
      offset = 0,
      startDate,
      endDate 
    } = req.query;

    let query = `
      SELECT 
        wn.*,
        u.name as user_name,
        u.contact as user_phone,
        a.title as appointment_title,
        p.name as partner_name
      FROM whatsapp_notifications wn
      LEFT JOIN users u ON wn.user_id = u.id
      LEFT JOIN appointments a ON wn.appointment_id = a.id
      LEFT JOIN partners p ON a.partner_id = p.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND wn.user_id = $${paramCount}`;
      values.push(userId);
    }

    if (appointmentId) {
      paramCount++;
      query += ` AND wn.appointment_id = $${paramCount}`;
      values.push(appointmentId);
    }

    if (status) {
      paramCount++;
      query += ` AND wn.status = $${paramCount}`;
      values.push(status);
    }

    if (startDate) {
      paramCount++;
      query += ` AND wn.created_at >= $${paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND wn.created_at <= $${paramCount}`;
      values.push(endDate);
    }

    query += ` ORDER BY wn.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM whatsapp_notifications wn
      WHERE 1=1
      ${userId ? 'AND wn.user_id = $1' : ''}
      ${appointmentId ? `AND wn.appointment_id = $${userId ? '2' : '1'}` : ''}
      ${status ? `AND wn.status = $${userId && appointmentId ? '3' : userId || appointmentId ? '2' : '1'}` : ''}
      ${startDate ? `AND wn.created_at >= $${userId && appointmentId && status ? '4' : userId && appointmentId || userId && status || appointmentId && status ? '3' : userId || appointmentId || status ? '2' : '1'}` : ''}
      ${endDate ? `AND wn.created_at <= $${userId && appointmentId && status && startDate ? '5' : userId && appointmentId && status || userId && appointmentId && startDate || userId && status && startDate || appointmentId && status && startDate ? '4' : userId && appointmentId || userId && status || userId && startDate || appointmentId && status || appointmentId && startDate || status && startDate ? '3' : userId || appointmentId || status || startDate ? '2' : '1'}` : ''}
    `;
    
    const countValues = values.slice(0, values.length - 2); // Remove limit and offset
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    console.error('Get WhatsApp logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp logs',
      details: error.message
    });
  }
};

/**
 * Get WhatsApp notification by ID
 */
const getWhatsAppNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        wn.*,
        u.name as user_name,
        u.contact as user_phone,
        a.title as appointment_title,
        p.name as partner_name
      FROM whatsapp_notifications wn
      LEFT JOIN users u ON wn.user_id = u.id
      LEFT JOIN appointments a ON wn.appointment_id = a.id
      LEFT JOIN partners p ON a.partner_id = p.id
      WHERE wn.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Get WhatsApp notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp notification',
      details: error.message
    });
  }
};

/**
 * Resend failed WhatsApp notification
 */
const resendWhatsAppNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the failed notification
    const notificationQuery = `
      SELECT wn.*, u.name as user_name, u.contact, a.title, a.appointment_date, 
             a.end_date, a.duration_minutes, a.timezone, p.name as partner_name
      FROM whatsapp_notifications wn
      JOIN users u ON wn.user_id = u.id
      JOIN appointments a ON wn.appointment_id = a.id
      JOIN partners p ON a.partner_id = p.id
      WHERE wn.id = $1 AND wn.status = 'failed'
    `;

    const notificationResult = await db.query(notificationQuery, [id]);
    
    if (notificationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Failed notification not found'
      });
    }

    const notification = notificationResult.rows[0];

    // Prepare appointment data
    const appointmentData = {
      userName: notification.user_name,
      therapistName: notification.partner_name,
      appointmentDate: notification.appointment_date,
      appointmentTime: new Date(notification.appointment_date).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      timezone: notification.timezone || 'IST',
      appointmentType: notification.title,
      duration: notification.duration_minutes || 60
    };

    // Send new notification
    const result = await whatsappService.sendAppointmentConfirmation(
      notification.contact,
      appointmentData,
      notification.appointment_id,
      notification.user_id
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification resent successfully',
        messageSid: result.messageSid
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Resend WhatsApp notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend WhatsApp notification',
      details: error.message
    });
  }
};

/**
 * Get WhatsApp service statistics
 */
const getWhatsAppStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const query = `
      SELECT 
        DATE(created_at) as date,
        status,
        COUNT(*) as count
      FROM whatsapp_notifications
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at), status
      ORDER BY date DESC, status
    `;

    const result = await db.query(query);

    // Transform data for easier consumption
    const statistics = {};
    result.rows.forEach(row => {
      if (!statistics[row.date]) {
        statistics[row.date] = {};
      }
      statistics[row.date][row.status] = parseInt(row.count);
    });

    // Get overall statistics
    const overallQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM whatsapp_notifications
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY status
    `;

    const overallResult = await db.query(overallQuery);

    res.json({
      success: true,
      statistics,
      overall: overallResult.rows,
      period: {
        days: parseInt(days),
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Get WhatsApp statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp statistics',
      details: error.message
    });
  }
};

/**
 * Send custom WhatsApp message from partner to client
 */
const sendPartnerMessage = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { userId, message, messageType = 'general_message' } = req.body;

    // Validate required fields
    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId and message are required'
      });
    }

    // Get user details to get phone number and name
    const userQuery = 'SELECT id, name, contact FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.contact) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a phone number'
      });
    }

    // Verify that the user is assigned to this partner
    const assignmentQuery = `
      SELECT 1 FROM user_partner_assignments
      WHERE user_id = $1 AND partner_id = $2
    `;
    const assignmentResult = await db.query(assignmentQuery, [userId, partnerId]);
    
    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'User is not assigned to this partner'
      });
    }

    // Get partner details for sender name
    const partnerQuery = 'SELECT name FROM partners WHERE id = $1';
    const partnerResult = await db.query(partnerQuery, [partnerId]);
    const partner = partnerResult.rows[0];

    // Prepare message data
    const messageData = {
      recipientName: user.name,
      senderName: partner.name,
      messageBody: message,
      includeSignature: true
    };

    // Send the message
    const result = await whatsappService.sendCustomMessage(
      user.contact,
      messageData,
      partnerId,
      userId,
      messageType
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: result.messageId,
        phoneNumber: result.phoneNumber
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send partner WhatsApp message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
};

/**
 * Get WhatsApp service status for partner
 */
const getPartnerWhatsAppStatus = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const status = await whatsappService.getStatusForPartner(partnerId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get partner WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status',
      details: error.message
    });
  }
};

/**
 * Get partner's WhatsApp message logs for their clients
 */
const getPartnerWhatsAppLogs = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const {
      userId,
      status,
      limit = 50,
      offset = 0,
      startDate,
      endDate
    } = req.query;

    let query = `
      SELECT
        wn.*,
        u.name as user_name,
        u.contact as user_phone
      FROM whatsapp_notifications wn
      JOIN users u ON wn.user_id = u.id
      WHERE wn.partner_id = $1
    `;
    
    const values = [partnerId];
    let paramCount = 1;

    if (userId) {
      paramCount++;
      query += ` AND wn.user_id = $${paramCount}`;
      values.push(userId);
    }

    if (status) {
      paramCount++;
      query += ` AND wn.status = $${paramCount}`;
      values.push(status);
    }

    if (startDate) {
      paramCount++;
      query += ` AND wn.created_at >= $${paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND wn.created_at <= $${paramCount}`;
      values.push(endDate);
    }

    query += ` ORDER BY wn.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM whatsapp_notifications wn
      WHERE wn.partner_id = $1
      ${userId ? 'AND wn.user_id = $2' : ''}
      ${status ? `AND wn.status = $${userId ? '3' : '2'}` : ''}
      ${startDate ? `AND wn.created_at >= $${userId && status ? '4' : userId || status ? '3' : '2'}` : ''}
      ${endDate ? `AND wn.created_at <= $${userId && status && startDate ? '5' : userId && status || userId && startDate || status && startDate ? '4' : userId || status || startDate ? '3' : '2'}` : ''}
    `;
    
    const countValues = values.slice(0, values.length - 2); // Remove limit and offset
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + result.rows.length < total
      }
    });
  } catch (error) {
    console.error('Get partner WhatsApp logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp logs',
      details: error.message
    });
  }
};

module.exports = {
  getWhatsAppStatus,
  testWhatsAppIntegration,
  getWhatsAppLogs,
  getWhatsAppNotificationById,
  resendWhatsAppNotification,
  getWhatsAppStatistics,
  sendPartnerMessage,
  getPartnerWhatsAppStatus,
  getPartnerWhatsAppLogs
};