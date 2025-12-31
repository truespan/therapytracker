const axios = require('axios');
const { Vonage } = require('@vonage/server-sdk');
const db = require('../config/database');
const Partner = require('../models/Partner');

/**
 * WhatsApp Service for sending appointment notifications
 * Uses Vonage API for WhatsApp Business integration
 */

class WhatsAppService {
  constructor() {
    this.enabled = false;
    this.fromNumber = null;
    this.apiKey = null;
    this.apiSecret = null;
    this.applicationId = null;
    this.privateKey = null;
    this.vonageClient = null;
    this.isSandbox = false;
    this.baseUrl = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.lastMessageTime = 0;
    this.minDelayBetweenMessages = 2000; // 2 seconds minimum between messages
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds initial retry delay
    
    this.initialize();
  }

  /**
   * Initialize Vonage client and configuration
   */
  initialize() {
    try {
      // Trim credentials to remove any accidental whitespace
      this.apiKey = process.env.VONAGE_API_KEY?.trim();
      this.apiSecret = process.env.VONAGE_API_SECRET?.trim();
      this.applicationId = process.env.VONAGE_APPLICATION_ID?.trim();
      this.privateKey = process.env.VONAGE_PRIVATE_KEY?.trim();
      this.fromNumber = process.env.VONAGE_WHATSAPP_NUMBER?.trim();
      this.enabled = process.env.WHATSAPP_ENABLED === 'true';
      this.isSandbox = process.env.VONAGE_SANDBOX === 'true';
      
      // Set base URL based on sandbox mode
      this.baseUrl = this.isSandbox
        ? 'https://messages-sandbox.nexmo.com/v1/messages'
        : 'https://api.nexmo.com/v1/messages';

      // Initialize Vonage client with JWT authentication if application ID and private key are provided
      if (this.enabled && this.applicationId && this.privateKey) {
        try {
          this.vonageClient = new Vonage({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            applicationId: this.applicationId,
            privateKey: this.privateKey
          });
          console.log(`[WhatsApp Service] Initialized with JWT authentication${this.isSandbox ? ' (SANDBOX MODE)' : ''}`);
          console.log(`[WhatsApp Service] Using endpoint: ${this.baseUrl}`);
        } catch (clientError) {
          console.error('[WhatsApp Service] Failed to initialize Vonage client:', clientError.message);
          this.enabled = false;
        }
      } else if (this.enabled && this.apiKey && this.apiSecret && this.fromNumber) {
        // Fallback to Basic Auth if no application ID/private key
        console.log(`[WhatsApp Service] Initialized with Basic Auth${this.isSandbox ? ' (SANDBOX MODE)' : ''}`);
        console.log(`[WhatsApp Service] Using endpoint: ${this.baseUrl}`);
        console.warn('[WhatsApp Service] NOTE: If your WhatsApp number is linked to an application, you need JWT authentication.');
        console.warn('[WhatsApp Service] Please set VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY for JWT authentication.');
      } else if (this.enabled) {
        console.warn('[WhatsApp Service] Enabled but missing configuration.');
        console.warn('[WhatsApp Service] For JWT auth (recommended): Set VONAGE_APPLICATION_ID, VONAGE_PRIVATE_KEY, VONAGE_WHATSAPP_NUMBER');
        console.warn('[WhatsApp Service] For Basic auth: Set VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_WHATSAPP_NUMBER');
        this.enabled = false;
      } else {
        console.log('[WhatsApp Service] Disabled (WHATSAPP_ENABLED=false)');
      }
    } catch (error) {
      console.error('[WhatsApp Service] Initialization failed:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Add message to queue for rate-limited sending
   * @param {Object} messageData - Message data including type, recipient, content
   */
  addToQueue(messageData) {
    this.messageQueue.push({
      ...messageData,
      retryCount: 0,
      timestamp: Date.now()
    });
    
    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process message queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;
      
      // Wait if not enough time has passed since last message
      if (timeSinceLastMessage < this.minDelayBetweenMessages) {
        const waitTime = this.minDelayBetweenMessages - timeSinceLastMessage;
        await this.delay(waitTime);
      }

      const message = this.messageQueue.shift();
      if (!message) continue;

      try {
        let result;
        switch (message.type) {
          case 'appointment_confirmation':
            result = await this.sendAppointmentConfirmationDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.userId
            );
            break;
          case 'therapist_notification':
            result = await this.sendTherapistAppointmentNotificationDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.partnerId
            );
            break;
          case 'custom_message':
            result = await this.sendCustomMessageDirect(
              message.toPhoneNumber,
              message.messageData,
              message.partnerId,
              message.userId,
              message.messageType
            );
            break;
        }

        if (result.success) {
          console.log(`[WhatsApp Queue] Message sent successfully: ${result.messageId}`);
        } else if (message.retryCount < this.maxRetries) {
          // Retry on failure
          message.retryCount++;
          const retryDelay = this.retryDelay * Math.pow(2, message.retryCount - 1); // Exponential backoff
          console.log(`[WhatsApp Queue] Retry ${message.retryCount}/${this.maxRetries} after ${retryDelay}ms`);
          
          setTimeout(() => {
            this.messageQueue.unshift(message); // Add back to queue for retry
            // Restart queue processing after delay
            if (!this.isProcessingQueue) {
              this.processQueue();
            }
          }, retryDelay);
        } else {
          console.error(`[WhatsApp Queue] Failed after ${this.maxRetries} retries:`, result.error);
        }

        this.lastMessageTime = Date.now();
      } catch (error) {
        console.error('[WhatsApp Queue] Error processing message:', error.message);
        if (message.retryCount < this.maxRetries) {
          message.retryCount++;
          this.messageQueue.unshift(message);
          // Restart queue processing after error
          setTimeout(() => {
            if (!this.isProcessingQueue) {
              this.processQueue();
            }
          }, this.retryDelay);
        }
      }

      // Small delay between processing messages
      await this.delay(100);
    }

    this.isProcessingQueue = false;
    
    // Check if new messages were added during processing
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Delay helper for rate limiting
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and format phone number for WhatsApp
   * @param {string} phoneNumber - Phone number to validate
   * @returns {string|null} Formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }

    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Check if it starts with + (international format)
    if (cleaned.startsWith('+')) {
      // Validate international format: +[country code][number]
      const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
      if (phoneRegex.test(cleaned)) {
        return cleaned;
      }
    } 
    // If no + and all digits, assume Indian number (+91)
    else if (/^\d+$/.test(cleaned)) {
      // If 10 digits, add +91 (India)
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      // If already includes country code (11+ digits)
      else if (cleaned.length >= 11 && cleaned.length <= 15) {
        return `+${cleaned}`;
      }
    }

    return null;
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid
   */
  validatePhoneNumber(phoneNumber) {
    return this.formatPhoneNumber(phoneNumber) !== null;
  }

  /**
   * Create WhatsApp appointment confirmation message
   * @param {Object} appointmentData - Appointment details
   * @returns {string} Formatted message
   */
  createAppointmentMessage(appointmentData) {
    const {
      userName,
      therapistName,
      appointmentDate,
      appointmentTime,
      timezone,
      appointmentType,
      duration
    } = appointmentData;

    // Use the provided appointmentTime if available, otherwise format the date
    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    
    if (!appointmentTime && appointmentDate) {
      // If no appointmentTime provided, format from appointmentDate
      const dateObj = new Date(appointmentDate);
      const localTimezone = timezone || 'Asia/Kolkata';
      
      displayTime = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: localTimezone
      });
      
      displayDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: localTimezone
      });
    } else if (appointmentDate) {
      // Format date only if appointmentTime is provided separately
      const dateObj = new Date(appointmentDate);
      const localTimezone = timezone || 'Asia/Kolkata';
      
      displayDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: localTimezone
      });
    }

    const timeZoneDisplay = timezone === 'UTC' ? 'IST' : (timezone || 'IST');

    return `🎉 *Appointment Confirmed!* 🎉

Hi ${userName || 'there'},

Your therapy session has been successfully booked:

📅 *Date:* ${displayDate}
🕐 *Time:* ${displayTime} (${timeZoneDisplay})
👨‍⚕️ *Therapist:* ${therapistName || 'Your therapist'}
🏥 *Type:* ${appointmentType || 'Therapy Session'}
⏱️ *Duration:* ${duration || 60} minutes

Please arrive 5 minutes early for your session.

If you need to reschedule or have any questions, please contact your therapist.

See you then! 😊

- *TheraP Track Team*`;
  }

  /**
   * Create WhatsApp appointment notification message for therapist/partner
   * @param {Object} appointmentData - Appointment details
   * @returns {string} Formatted message
   */
  createTherapistAppointmentMessage(appointmentData) {
    const {
      therapistName,
      clientName,
      appointmentDate,
      appointmentTime,
      timezone,
      appointmentType,
      duration,
      clientPhone,
      clientEmail
    } = appointmentData;

    // Use the provided appointmentTime if available, otherwise format the date
    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    
    if (!appointmentTime && appointmentDate) {
      // If no appointmentTime provided, format from appointmentDate
      const dateObj = new Date(appointmentDate);
      const localTimezone = timezone || 'Asia/Kolkata';
      
      displayTime = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: localTimezone
      });
      
      displayDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: localTimezone
      });
    } else if (appointmentDate) {
      // Format date only if appointmentTime is provided separately
      const dateObj = new Date(appointmentDate);
      const localTimezone = timezone || 'Asia/Kolkata';
      
      displayDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: localTimezone
      });
    }

    const timeZoneDisplay = timezone === 'UTC' ? 'IST' : (timezone || 'IST');

    return `📅 *New Appointment Booked!* 📅

Hi ${therapistName || 'Therapist'},

A new therapy session has been booked:

👤 *Client:* ${clientName || 'Client'}
📞 *Phone:* ${clientPhone || 'Not provided'}
📧 *Email:* ${clientEmail || 'Not provided'}
📅 *Date:* ${displayDate}
🕐 *Time:* ${displayTime} (${timeZoneDisplay})
🏥 *Type:* ${appointmentType || 'Therapy Session'}
⏱️ *Duration:* ${duration || 60} minutes

Please prepare for the session and contact the client if needed.

— *TheraP Track System*`;
  }

  /**
   * Send WhatsApp appointment confirmation (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentConfirmation(toPhoneNumber, appointmentData, appointmentId, userId) {
    // Check if service is enabled
    if (!this.enabled) {
      return {
        success: false,
        error: 'WhatsApp service is disabled'
      };
    }

    // Validate phone number
    const formattedPhone = this.formatPhoneNumber(toPhoneNumber);
    if (!formattedPhone) {
      const error = `Invalid phone number format: ${toPhoneNumber}`;
      await this.logNotification(appointmentId, userId, toPhoneNumber, 'failed', null, error);
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'appointment_confirmation',
      toPhoneNumber: formattedPhone,
      appointmentData,
      appointmentId,
      userId
    });

    return {
      success: true,
      status: 'queued',
      message: 'Message added to queue for rate-limited sending'
    };
  }

  /**
   * Send WhatsApp appointment confirmation directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentConfirmationDirect(toPhoneNumber, appointmentData, appointmentId, userId) {
    try {
      // Create message content
      const messageBody = this.createAppointmentMessage(appointmentData);

      // Send message using appropriate authentication method
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      
      if (this.vonageClient) {
        // Use Vonage SDK with JWT authentication
        const result = await this.vonageClient.messages.send({
          message_type: 'text',
          channel: 'whatsapp',
          to: toNumber,
          from: fromNumber,
          text: messageBody
        });
        messageId = result.message_uuid;
      } else {
        // Fallback to Basic Auth
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        
        const response = await axios.post(this.baseUrl, {
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'text',
          text: messageBody
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
        messageId = response.data.message_uuid;
      }

      // Log successful notification
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'sent',
        messageId,
        null
      );

      console.log(`[WhatsApp Service] Message sent successfully: ${messageId}`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      // Enhanced error logging for Vonage API errors
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send message:', error.message);
      console.error('[WhatsApp Service] Error details:', {
        ...errorDetails,
        config: {
          from: this.fromNumber,
          to: toPhoneNumber.replace('+', ''),
          channel: 'whatsapp',
          message_type: 'text'
        },
        appointmentId,
        userId
      });
      
      // Check if it's a sandbox registration issue
      if (this.isSandboxRegistrationError(error)) {
        console.error('[WhatsApp Service] SANDBOX ISSUE: Recipient number not registered in Vonage WhatsApp sandbox');
        console.error('[WhatsApp Service] Please register this number in your Vonage dashboard: Messages and Dispatch > Sandbox > WhatsApp');
      }
      
      // Log failed notification
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details)
      );

      return {
        success: false,
        error: error.message,
        details: errorDetails.details,
        isSandboxError: this.isSandboxRegistrationError(error)
      };
    }
  }

  /**
   * Send WhatsApp appointment notification to therapist/partner (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number (therapist)
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} partnerId - Partner ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendTherapistAppointmentNotification(toPhoneNumber, appointmentData, appointmentId, partnerId) {
    // Check if service is enabled
    if (!this.enabled) {
      return {
        success: false,
        error: 'WhatsApp service is disabled'
      };
    }

    // Validate phone number
    const formattedPhone = this.formatPhoneNumber(toPhoneNumber);
    if (!formattedPhone) {
      const error = `Invalid phone number format: ${toPhoneNumber}`;
      await this.logNotification(appointmentId, null, toPhoneNumber, 'failed', null, error);
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'therapist_notification',
      toPhoneNumber: formattedPhone,
      appointmentData,
      appointmentId,
      partnerId
    });

    return {
      success: true,
      status: 'queued',
      message: 'Message added to queue for rate-limited sending'
    };
  }

  /**
   * Send WhatsApp appointment notification to therapist/partner directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number (therapist)
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} partnerId - Partner ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendTherapistAppointmentNotificationDirect(toPhoneNumber, appointmentData, appointmentId, partnerId) {
    try {
      // Create message content
      const messageBody = this.createTherapistAppointmentMessage(appointmentData);

      // Send message using appropriate authentication method
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      
      if (this.vonageClient) {
        // Use Vonage SDK with JWT authentication
        const result = await this.vonageClient.messages.send({
          message_type: 'text',
          channel: 'whatsapp',
          to: toNumber,
          from: fromNumber,
          text: messageBody
        });
        messageId = result.message_uuid;
      } else {
        // Fallback to Basic Auth
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        
        const response = await axios.post(this.baseUrl, {
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'text',
          text: messageBody
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
        messageId = response.data.message_uuid;
      }

      // Log successful notification
      await this.logNotification(
        appointmentId,
        null, // userId is null for therapist notifications
        toPhoneNumber,
        'sent',
        messageId,
        null
      );

      console.log(`[WhatsApp Service] Therapist notification sent successfully: ${messageId}`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      // Enhanced error logging for Vonage API errors
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send therapist notification:', error.message);
      console.error('[WhatsApp Service] Therapist notification error details:', {
        ...errorDetails,
        config: {
          from: this.fromNumber,
          to: toPhoneNumber.replace('+', ''),
          channel: 'whatsapp',
          message_type: 'text'
        },
        appointmentId,
        partnerId
      });
      
      // Check if it's a sandbox registration issue
      if (this.isSandboxRegistrationError(error)) {
        console.error('[WhatsApp Service] SANDBOX ISSUE: Recipient number not registered in Vonage WhatsApp sandbox');
        console.error('[WhatsApp Service] Please register this number in your Vonage dashboard: Messages and Dispatch > Sandbox > WhatsApp');
      }
      
      // Log failed notification
      await this.logNotification(
        appointmentId,
        null,
        toPhoneNumber,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details)
      );

      return {
        success: false,
        error: error.message,
        details: errorDetails.details,
        isSandboxError: this.isSandboxRegistrationError(error)
      };
    }
  }

  /**
   * Log WhatsApp notification to database
   * @param {number} appointmentId - Appointment ID
   * @param {number} userId - User ID
   * @param {string} phoneNumber - Phone number
   * @param {string} status - Notification status
   * @param {string} messageId - Vonage message ID
   * @param {string} errorMessage - Error message if failed
   */
  async logNotification(appointmentId, userId, phoneNumber, status, messageId = null, errorMessage = null) {
    try {
      const query = `
        INSERT INTO whatsapp_notifications
        (appointment_id, user_id, phone_number, message_type, status, vonage_message_id, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END)
      `;
      
      const values = [
        appointmentId,
        userId,
        phoneNumber,
        'appointment_confirmation',
        status,
        messageId,
        errorMessage,
        status  // Separate parameter for CASE statement to avoid type inference issues
      ];

      await db.query(query, values);
    } catch (logError) {
      console.error('[WhatsApp Service] Failed to log notification:', logError.message);
      console.error('[WhatsApp Service] Log error details:', {
        appointmentId,
        userId,
        phoneNumber,
        status,
        messageId,
        errorMessage,
        logError: logError.message
      });
    }
  }

  /**
   * Get WhatsApp service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      configured: !!(this.vonage && this.fromNumber),
      fromNumber: this.fromNumber
    };
  }

  /**
   * Test WhatsApp integration
   * @param {string} testPhoneNumber - Test phone number
   * @returns {Promise<Object>} Test result
   */
  async testIntegration(testPhoneNumber) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'WhatsApp service is disabled'
      };
    }

    // Validate credentials before making API call
    // Check if we have JWT credentials (preferred) or Basic Auth credentials
    const hasJWTAuth = this.applicationId && this.privateKey;
    const hasBasicAuth = this.apiKey && this.apiSecret;
    
    if (!hasJWTAuth && !hasBasicAuth) {
      return {
        success: false,
        error: 'Vonage API credentials are missing',
        details: {
          type: 'configuration_error',
          title: 'Missing Credentials',
          detail: 'You need either JWT authentication (VONAGE_APPLICATION_ID + VONAGE_PRIVATE_KEY) or Basic Auth (VONAGE_API_KEY + VONAGE_API_SECRET). JWT is recommended if your WhatsApp number is linked to an application.',
          missingFields: {
            jwtAuth: {
              applicationId: !this.applicationId,
              privateKey: !this.privateKey
            },
            basicAuth: {
              apiKey: !this.apiKey,
              apiSecret: !this.apiSecret
            }
          }
        },
        status: 401
      };
    }

    if (!this.fromNumber) {
      return {
        success: false,
        error: 'Vonage WhatsApp number is missing',
        details: {
          type: 'configuration_error',
          title: 'Missing WhatsApp Number',
          detail: 'VONAGE_WHATSAPP_NUMBER is not set in your environment variables. Please check your .env file.'
        },
        status: 400
      };
    }

    const formattedPhone = this.formatPhoneNumber(testPhoneNumber);
    if (!formattedPhone) {
      return {
        success: false,
        error: `Invalid phone number format: ${testPhoneNumber}`
      };
    }

    try {
      // Send test message via direct HTTP call
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = formattedPhone.replace('+', '');
      
      // Debug logging (mask credentials for security)
      console.log('[WhatsApp Service] Test Integration Debug:');
      console.log('  - Has Vonage Client (JWT):', !!this.vonageClient);
      console.log('  - Has Application ID:', !!this.applicationId);
      console.log('  - Has Private Key:', !!this.privateKey);
      console.log('  - API Key length:', this.apiKey ? this.apiKey.length : 0);
      console.log('  - API Secret length:', this.apiSecret ? this.apiSecret.length : 0);
      console.log('  - API Key first 4 chars:', this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'N/A');
      console.log('  - From Number:', fromNumber);
      console.log('  - To Number:', toNumber);
      console.log('  - Base URL:', this.baseUrl);
      console.log('  - Sandbox Mode:', this.isSandbox);
      
      let response;
      
      // Use JWT authentication if Vonage client is available
      if (this.vonageClient) {
        console.log('[WhatsApp Service] Using JWT authentication via Vonage SDK');
        
        // Use Vonage SDK to send message (it handles JWT automatically)
        try {
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: '🧪 *TheraP Track WhatsApp Test*\n\nThis is a test message from your TheraP Track system. If you received this, your WhatsApp integration is working correctly! ✅'
          });
          
          response = { data: { message_uuid: result.message_uuid } };
        } catch (sdkError) {
          // If SDK fails, throw error with details
          throw sdkError;
        }
      } else {
        // Fallback to Basic Auth
        console.log('[WhatsApp Service] Using Basic Auth');
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        
        response = await axios.post(this.baseUrl, {
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'text',
          text: '🧪 *TheraP Track WhatsApp Test*\n\nThis is a test message from your TheraP Track system. If you received this, your WhatsApp integration is working correctly! ✅'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
      }

      const messageId = response.data.message_uuid;

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        phoneNumber: formattedPhone
      };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      
      // Log detailed error information
      console.error('[WhatsApp Service] Test failed:', {
        error: error.message,
        status: errorDetails.status,
        details: errorDetails.details,
        isSandbox: this.isSandbox,
        baseUrl: this.baseUrl
      });
      
      // Handle 401 Unauthorized errors specifically
      if (errorDetails.status === 401 || errorDetails.statusCode === 401) {
        console.error('[WhatsApp Service] AUTHENTICATION ERROR: Invalid Vonage API credentials');
        console.error('[WhatsApp Service] Please verify:');
        
        if (this.vonageClient) {
          console.error('  [JWT Authentication Mode]');
          console.error('  1. VONAGE_APPLICATION_ID is correct in your .env file');
          console.error('  2. VONAGE_PRIVATE_KEY is correct and properly formatted');
          console.error('  3. Your WhatsApp number is linked to the correct application');
          console.error('  4. Your application credentials have not expired or been revoked');
        } else {
          console.error('  [Basic Authentication Mode]');
          console.error('  1. VONAGE_API_KEY is correct in your .env file');
          console.error('  2. VONAGE_API_SECRET is correct in your .env file');
          console.error('  3. If your WhatsApp number is linked to an application, you MUST use JWT authentication');
          console.error('     Set VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY instead');
        }
        console.error('  - Your Vonage account has WhatsApp messaging enabled');
        console.error('  - You have restarted the server after updating .env file');
        
        const authMode = this.vonageClient ? 'JWT' : 'Basic Auth';
        const steps = this.vonageClient ? [
          'Verify VONAGE_APPLICATION_ID is correct in your .env file',
          'Verify VONAGE_PRIVATE_KEY is correct and properly formatted (should be the full private key text)',
          'Check your Vonage Dashboard → Applications to ensure the application exists',
          'Verify your WhatsApp number is linked to this application',
          'Ensure your application has not been deleted or credentials revoked',
          'Restart your server after updating .env file (environment variables are loaded at startup)'
        ] : [
          'Check if your WhatsApp number is linked to a Vonage application',
          'If linked: You MUST use JWT authentication. Set VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY',
          'If not linked: Verify VONAGE_API_KEY is correct in your .env file',
          'If not linked: Verify VONAGE_API_SECRET is correct in your .env file',
          'Check your Vonage Dashboard to ensure credentials are active',
          'Ensure your Vonage account has WhatsApp messaging enabled',
          'Restart your server after updating .env file (environment variables are loaded at startup)'
        ];
        
        return {
          success: false,
          error: `Authentication failed: Invalid Vonage credentials (${authMode})`,
          details: {
            ...errorDetails.details,
            troubleshooting: {
              type: 'authentication_error',
              title: `Invalid Credentials (${authMode})`,
              detail: this.vonageClient 
                ? 'JWT authentication failed. The VONAGE_APPLICATION_ID or VONAGE_PRIVATE_KEY is incorrect or invalid.'
                : 'Basic authentication failed. If your WhatsApp number is linked to an application, you must use JWT authentication instead.',
              authMode: authMode,
              steps: steps,
              dashboardUrl: 'https://dashboard.nexmo.com/'
            }
          },
          isSandboxError: false,
          status: 401
        };
      }
      
      if (this.isSandboxRegistrationError(error)) {
        console.error('[WhatsApp Service] SANDBOX ISSUE: Test number not registered in Vonage WhatsApp sandbox');
      } else if (errorDetails.status === 422) {
        console.error('[WhatsApp Service] PRODUCTION ERROR: 422 status - Check Vonage dashboard for details');
        console.error('[WhatsApp Service] Common causes:');
        console.error('  - Recipient number not verified/approved for WhatsApp Business messages');
        console.error('  - Message template not approved (if using templates)');
        console.error('  - Invalid message format');
        console.error('  - Rate limiting or account restrictions');
      }
      
      return {
        success: false,
        error: error.message,
        details: errorDetails.details,
        isSandboxError: this.isSandboxRegistrationError(error),
        status: errorDetails.status || errorDetails.statusCode
      };
    }
  }

  /**
   * Create a custom WhatsApp message for partner-to-client communication
   * @param {Object} messageData - Message details
   * @returns {string} Formatted message
   */
  createCustomMessage(messageData) {
    const {
      recipientName,
      senderName,
      messageBody,
      includeSignature = true
    } = messageData;

    let message = `📱 *Message from ${senderName || 'Your Therapist'}* 📱\n\n`;
    
    if (recipientName) {
      message += `Hi ${recipientName},\n\n`;
    }
    
    message += `${messageBody}\n\n`;
    
    if (includeSignature) {
      message += `— ${senderName || 'TheraP Track Team'}`;
    }

    return message;
  }

  /**
   * Send a custom WhatsApp message from partner to client (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} messageData - Message details including body, sender name, etc.
   * @param {number} partnerId - Partner ID for logging
   * @param {number} userId - User/Client ID for logging
   * @param {string} messageType - Type of message (e.g., 'appointment_reminder', 'general_message')
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendCustomMessage(toPhoneNumber, messageData, partnerId, userId, messageType = 'general_message') {
    // Check if service is enabled
    if (!this.enabled) {
      return {
        success: false,
        error: 'WhatsApp service is disabled'
      };
    }

    // Validate phone number
    const formattedPhone = this.formatPhoneNumber(toPhoneNumber);
    if (!formattedPhone) {
      const error = `Invalid phone number format: ${toPhoneNumber}`;
      await this.logCustomNotification(partnerId, userId, formattedPhone, messageType, 'failed', null, error);
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'custom_message',
      toPhoneNumber: formattedPhone,
      messageData,
      partnerId,
      userId,
      messageType
    });

    return {
      success: true,
      status: 'queued',
      message: 'Message added to queue for rate-limited sending'
    };
  }

  /**
   * Send a custom WhatsApp message from partner to client directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} messageData - Message details including body, sender name, etc.
   * @param {number} partnerId - Partner ID for logging
   * @param {number} userId - User/Client ID for logging
   * @param {string} messageType - Type of message (e.g., 'appointment_reminder', 'general_message')
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendCustomMessageDirect(toPhoneNumber, messageData, partnerId, userId, messageType = 'general_message') {
    try {
      // Create message content
      const messageBody = this.createCustomMessage(messageData);

      // Send message using appropriate authentication method
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      
      if (this.vonageClient) {
        // Use Vonage SDK with JWT authentication
        const result = await this.vonageClient.messages.send({
          message_type: 'text',
          channel: 'whatsapp',
          to: toNumber,
          from: fromNumber,
          text: messageBody
        });
        messageId = result.message_uuid;
      } else {
        // Fallback to Basic Auth
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        
        const response = await axios.post(this.baseUrl, {
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'text',
          text: messageBody
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
        messageId = response.data.message_uuid;
      }

      // Log successful notification
      await this.logCustomNotification(
        partnerId,
        userId,
        toPhoneNumber,
        messageType,
        'sent',
        messageId,
        null
      );

      console.log(`[WhatsApp Service] Custom message sent successfully: ${messageId}`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        phoneNumber: toPhoneNumber
      };
    } catch (error) {
      // Enhanced error logging for Vonage API errors
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send custom message:', error.message);
      console.error('[WhatsApp Service] Custom message error details:', {
        ...errorDetails,
        config: {
          from: this.fromNumber,
          to: toPhoneNumber.replace('+', ''),
          channel: 'whatsapp',
          message_type: 'text'
        },
        partnerId,
        userId,
        messageType
      });
      
      // Check if it's a sandbox registration issue
      if (this.isSandboxRegistrationError(error)) {
        console.error('[WhatsApp Service] SANDBOX ISSUE: Recipient number not registered in Vonage WhatsApp sandbox');
        console.error('[WhatsApp Service] Please register this number in your Vonage dashboard: Messages and Dispatch > Sandbox > WhatsApp');
      }
      
      // Log failed notification
      await this.logCustomNotification(
        partnerId,
        userId,
        toPhoneNumber,
        messageType,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details)
      );

      return {
        success: false,
        error: error.message,
        details: errorDetails.details,
        isSandboxError: this.isSandboxRegistrationError(error)
      };
    }
  }

  /**
   * Validate Vonage API configuration and credentials
   * @returns {Object} Validation result with status and details
   */
  validateConfig() {
    const errors = [];
    const warnings = [];
    
    // Check if service is enabled
    if (!this.enabled) {
      errors.push('WhatsApp service is disabled (WHATSAPP_ENABLED=false)');
    }
    
    // Check API credentials
    if (!this.apiKey) {
      errors.push('VONAGE_API_KEY is not set');
    } else if (this.apiKey.length < 10) {
      warnings.push('VONAGE_API_KEY seems unusually short');
    }
    
    if (!this.apiSecret) {
      errors.push('VONAGE_API_SECRET is not set');
    } else if (this.apiSecret.length < 20) {
      warnings.push('VONAGE_API_SECRET seems unusually short');
    }
    
    if (!this.fromNumber) {
      errors.push('VONAGE_WHATSAPP_NUMBER is not set');
    } else {
      // Validate WhatsApp number format (should start with + and be E.164)
      const phoneRegex = /^\+\d{10,15}$/;
      if (!phoneRegex.test(this.fromNumber)) {
        errors.push(`VONAGE_WHATSAPP_NUMBER format invalid: ${this.fromNumber}. Should be E.164 format (+1234567890)`);
      }
    }
    
    // Check if we have all required configuration for direct API calls
    if (this.enabled && (!this.apiKey || !this.apiSecret || !this.fromNumber)) {
      errors.push('Missing required configuration for WhatsApp service');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config: {
        enabled: this.enabled,
        fromNumber: this.fromNumber,
        hasApiKey: !!this.apiKey,
        hasApiSecret: !!this.apiSecret,
        isSandbox: this.isSandbox,
        endpoint: this.baseUrl
      }
    };
  }

  /**
   * Log custom WhatsApp notification to database
   * @param {number} partnerId - Partner ID
   * @param {number} userId - User ID
   * @param {string} phoneNumber - Phone number
   * @param {string} messageType - Type of message
   * @param {string} status - Notification status
   * @param {string} messageId - Vonage message ID
   * @param {string} errorMessage - Error message if failed
   */
  async logCustomNotification(partnerId, userId, phoneNumber, messageType, status, messageId = null, errorMessage = null) {
    try {
      const query = `
        INSERT INTO whatsapp_notifications
        (partner_id, user_id, phone_number, message_type, status, vonage_message_id, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END)
      `;
      
      const values = [
        partnerId,
        userId,
        phoneNumber,
        messageType,
        status,
        messageId,
        errorMessage,
        status  // Separate parameter for CASE statement to avoid type inference issues
      ];

      await db.query(query, values);
    } catch (logError) {
      console.error('[WhatsApp Service] Failed to log custom notification:', logError.message);
      console.error('[WhatsApp Service] Custom log error details:', {
        partnerId,
        userId,
        phoneNumber,
        messageType,
        status,
        messageId,
        errorMessage,
        logError: logError.message
      });
    }
  }

  /**
   * Get WhatsApp service status with partner-specific details
   * @param {number} partnerId - Partner ID to check access
   * @returns {Promise<Object>} Service status with access information
   */
  async getStatusForPartner(partnerId) {
    const baseStatus = this.getStatus();
    
    if (!baseStatus.enabled) {
      return {
        ...baseStatus,
        partnerAccess: false,
        reason: 'service_disabled'
      };
    }

    try {
      // Check if partner's organization is TheraPTrack controlled
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        return {
          ...baseStatus,
          partnerAccess: false,
          reason: 'partner_not_found'
        };
      }

      const isTheraPTrackControlled = await Organization.isTheraPTrackControlled(partner.organization_id);
      
      return {
        ...baseStatus,
        partnerAccess: isTheraPTrackControlled,
        reason: isTheraPTrackControlled ? 'enabled' : 'organization_not_controlled',
        organizationId: partner.organization_id
      };
    } catch (error) {
      console.error('Error checking partner WhatsApp status:', error);
      return {
        ...baseStatus,
        partnerAccess: false,
        reason: 'error',
        error: error.message
      };
    }
  }

  /**
   * Extract detailed error information from Vonage API errors
   * @param {Error} error - The error object
   * @returns {Object} Parsed error details
   */
  extractErrorDetails(error) {
    // For axios errors, status code is in error.response.status
    const statusCode = error.response?.status || error.status || error.statusCode;
    
    const details = {
      message: error.message,
      status: statusCode,
      statusCode: statusCode,
      details: null
    };

    // Try to extract detailed error information
    if (error.response?.data) {
      details.details = error.response.data;
    } else if (error.response?.body) {
      try {
        details.details = JSON.parse(error.response.body);
      } catch {
        details.details = error.response.body;
      }
    } else if (error.body) {
      try {
        details.details = JSON.parse(error.body);
      } catch {
        details.details = error.body;
      }
    }

    return details;
  }

  /**
   * Check if error is due to sandbox registration issue
   * @param {Error} error - The error object
   * @returns {boolean} True if it's a sandbox registration error
   */
  isSandboxRegistrationError(error) {
    // Only check for sandbox errors if we're actually in sandbox mode
    if (!this.isSandbox) {
      return false;
    }
    
    const errorDetails = this.extractErrorDetails(error);
    const errorString = JSON.stringify(errorDetails.details || '').toLowerCase();
    
    return (
      errorDetails.status === 422 ||
      error.message.includes('Invalid message type') ||
      errorString.includes('invalid message type') ||
      errorString.includes('sandbox') ||
      errorString.includes('registration')
    );
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;