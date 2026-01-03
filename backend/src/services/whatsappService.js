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
    
    // WhatsApp Template Names (set via environment variables)
    this.templateNames = {
      appointmentConfirmation: null, // theraptrack_appointment_is_booked
      appointmentReminder: null, // theraptrack_appointment_reminder
      appointmentCancellation: null, // theraptrack_appointment_cancelled
      appointmentRescheduled: null // theraptrack_appointment_rescheduled
    };
    this.useTemplates = false; // Will be true if at least one template is configured
    this.includePaymentStatusInTemplate = process.env.WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS === 'true'; // Whether to include payment status as 7th parameter
    
    // WhatsApp Template Configuration
    this.templateNamespace = null; // WhatsApp template namespace (e.g., 'c0a5f8e8_a30e_41fd_9474_beea4345e9b5')
    this.templateLocale = 'en_US'; // Default locale for templates
    
    this.initialize();
  }

  /**
   * Initialize Vonage client and configuration
   */
  initialize() {
    try {
      console.log('[WhatsApp Service] Initializing...');
      console.log('[WhatsApp Service] WHATSAPP_ENABLED:', process.env.WHATSAPP_ENABLED);
      
      // Trim credentials to remove any accidental whitespace
      this.apiKey = process.env.VONAGE_API_KEY?.trim();
      this.apiSecret = process.env.VONAGE_API_SECRET?.trim();
      this.applicationId = process.env.VONAGE_APPLICATION_ID?.trim();
      
      console.log('[WhatsApp Service] Has API Key:', !!this.apiKey);
      console.log('[WhatsApp Service] Has API Secret:', !!this.apiSecret);
      console.log('[WhatsApp Service] Has Application ID:', !!this.applicationId);
      
      // Process private key - handle both single-line and multi-line formats
      let rawPrivateKey = process.env.VONAGE_PRIVATE_KEY;
      console.log('[WhatsApp Service] VONAGE_PRIVATE_KEY exists:', !!rawPrivateKey);
      if (rawPrivateKey) {
        console.log('[WhatsApp Service] Raw private key length:', rawPrivateKey.length);
        console.log('[WhatsApp Service] Raw key contains literal \\n:', rawPrivateKey.includes('\\n'));
        console.log('[WhatsApp Service] Raw key contains actual newlines:', rawPrivateKey.includes('\n'));
        console.log('[WhatsApp Service] Raw key first 50 chars:', rawPrivateKey.substring(0, 50));
        
        // Remove surrounding quotes if present (from environment variable)
        rawPrivateKey = rawPrivateKey.trim();
        if ((rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) ||
            (rawPrivateKey.startsWith("'") && rawPrivateKey.endsWith("'"))) {
          console.log('[WhatsApp Service] Removing surrounding quotes from private key');
          rawPrivateKey = rawPrivateKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines if they exist
        rawPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');
        
        console.log('[WhatsApp Service] After processing - contains newlines:', rawPrivateKey.includes('\n'));
        console.log('[WhatsApp Service] After processing - line count:', rawPrivateKey.split('\n').length);
        console.log('[WhatsApp Service] After processing - first 50 chars:', rawPrivateKey.substring(0, 50));
        
        // Trim only leading/trailing whitespace, preserve internal formatting
        this.privateKey = rawPrivateKey.trim();
        
        // Validate private key format - check for both with and without dashes
        const hasBeginMarker = this.privateKey.includes('BEGIN PRIVATE KEY') || this.privateKey.includes('-----BEGIN PRIVATE KEY-----');
        const hasEndMarker = this.privateKey.includes('END PRIVATE KEY') || this.privateKey.includes('-----END PRIVATE KEY-----');
        
        if (!hasBeginMarker || !hasEndMarker) {
          console.error('[WhatsApp Service] VONAGE_PRIVATE_KEY appears to be invalid - missing BEGIN/END markers');
          console.error('[WhatsApp Service] Private key should include "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----"');
          console.error('[WhatsApp Service] Private key first 100 chars:', this.privateKey.substring(0, 100));
          console.error('[WhatsApp Service] Private key last 100 chars:', this.privateKey.substring(Math.max(0, this.privateKey.length - 100)));
          this.privateKey = null;
        } else {
          console.log('[WhatsApp Service] Private key validation passed');
          console.log('[WhatsApp Service] Private key is set:', !!this.privateKey);
        }
      } else {
        console.log('[WhatsApp Service] VONAGE_PRIVATE_KEY is not set in environment');
        this.privateKey = null;
      }
      
      this.fromNumber = process.env.VONAGE_WHATSAPP_NUMBER?.trim();
      this.enabled = process.env.WHATSAPP_ENABLED === 'true';
      this.isSandbox = process.env.VONAGE_SANDBOX === 'true';
      
      // Load template configuration from environment variables
      this.templateNamespace = process.env.WHATSAPP_TEMPLATE_NAMESPACE?.trim() || null;
      this.templateLocale = process.env.WHATSAPP_TEMPLATE_LOCALE?.trim() || 'en_US';
      
      // Load template names from environment variables
      // Support both old and new template name formats
      this.templateNames.appointmentConfirmation = process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMATION?.trim() || 
                                                   process.env.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED?.trim() || 
                                                   'theraptrack_appointment_is_booked';
      this.templateNames.appointmentReminder = process.env.WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER?.trim() || 
                                               'theraptrack_appointment_reminder';
      this.templateNames.appointmentCancellation = process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLATION?.trim() || 
                                                   'theraptrack_appointment_cancelled';
      this.templateNames.appointmentRescheduled = process.env.WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED?.trim() || 
                                                  'theraptrack_appointment_rescheduled';
      
      // Check if templates are configured
      this.useTemplates = !!(this.templateNames.appointmentConfirmation || 
                            this.templateNames.appointmentReminder || 
                            this.templateNames.appointmentCancellation ||
                            this.templateNames.appointmentRescheduled);
      
      console.log('[WhatsApp Service] Enabled:', this.enabled);
      console.log('[WhatsApp Service] From Number:', this.fromNumber || 'NOT SET');
      console.log('[WhatsApp Service] Sandbox Mode:', this.isSandbox);
      console.log('[WhatsApp Service] Template Support:', this.useTemplates ? 'ENABLED' : 'DISABLED');
      console.log('[WhatsApp Service] Include Payment Status in Template:', this.includePaymentStatusInTemplate);
      if (this.useTemplates) {
        console.log('[WhatsApp Service] Template Configuration:');
        console.log('  - Namespace:', this.templateNamespace || 'NOT SET (using default)');
        console.log('  - Locale:', this.templateLocale);
        console.log('[WhatsApp Service] Templates configured:');
        console.log('  - Appointment Booked:', this.templateNames.appointmentConfirmation || 'NOT SET');
        console.log('  - Appointment Reminder:', this.templateNames.appointmentReminder || 'NOT SET');
        console.log('  - Appointment Cancellation:', this.templateNames.appointmentCancellation || 'NOT SET');
        console.log('  - Appointment Rescheduled:', this.templateNames.appointmentRescheduled || 'NOT SET');
      }
      
      // Set base URL based on sandbox mode
      this.baseUrl = this.isSandbox
        ? 'https://messages-sandbox.nexmo.com/v1/messages'
        : 'https://api.nexmo.com/v1/messages';

      // Initialize Vonage client with JWT authentication if application ID and private key are provided
      if (this.enabled && this.applicationId && this.privateKey) {
        try {
          console.log('[WhatsApp Service] Attempting to initialize Vonage client with JWT...');
          console.log('[WhatsApp Service] Application ID:', this.applicationId.substring(0, 8) + '...');
          console.log('[WhatsApp Service] Private key length:', this.privateKey.length);
          console.log('[WhatsApp Service] Private key starts with:', this.privateKey.substring(0, 30) + '...');
          console.log('[WhatsApp Service] Private key ends with:', '...' + this.privateKey.substring(this.privateKey.length - 30));
          console.log('[WhatsApp Service] Private key has newlines:', this.privateKey.includes('\n'));
          console.log('[WhatsApp Service] Private key line count:', this.privateKey.split('\n').length);
          
          // Initialize Vonage client with JWT credentials
          console.log('[WhatsApp Service] Initializing Vonage client with JWT credentials...');
          this.vonageClient = new Vonage({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            applicationId: this.applicationId,
            privateKey: this.privateKey
          });
          console.log(`[WhatsApp Service] ✓ Initialized with JWT authentication${this.isSandbox ? ' (SANDBOX MODE)' : ''}`);
          console.log(`[WhatsApp Service] Using endpoint: ${this.baseUrl}`);
        } catch (clientError) {
          console.error('[WhatsApp Service] Failed to initialize Vonage client:', clientError.message);
          console.error('[WhatsApp Service] Error details:', clientError);
          if (clientError.stack) {
            console.error('[WhatsApp Service] Stack:', clientError.stack);
          }
          console.error('[WhatsApp Service] This usually means:');
          console.error('  1. VONAGE_PRIVATE_KEY is not properly formatted');
          console.error('  2. The private key needs to include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
          console.error('  3. Newlines in the key should be actual newlines, not \\n strings');
          console.error('[WhatsApp Service] Service is enabled but not fully configured - fix credentials and restart');
          // Don't disable the service - let the user see the status and error
          // this.enabled = false; // Removed - keep enabled so status shows properly
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

    console.log(`[WhatsApp Queue] 🚀 Starting queue processing. Queue length: ${this.messageQueue.length}`);
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      console.log(`[WhatsApp Queue] Processing queue. Remaining messages: ${this.messageQueue.length}`);
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;
      
      // Wait if not enough time has passed since last message
      if (timeSinceLastMessage < this.minDelayBetweenMessages) {
        const waitTime = this.minDelayBetweenMessages - timeSinceLastMessage;
        await this.delay(waitTime);
      }

      const message = this.messageQueue.shift();
      if (!message) {
        console.log(`[WhatsApp Queue] Skipping empty message`);
        continue;
      }

      console.log(`[WhatsApp Queue] 📨 Processing message:`, {
        type: message.type,
        toPhoneNumber: message.toPhoneNumber,
        appointmentId: message.appointmentId,
        userId: message.userId,
        partnerId: message.partnerId,
        retryCount: message.retryCount,
        queueLength: this.messageQueue.length
      });

      try {
        let result;
        switch (message.type) {
          case 'appointment_confirmation':
            console.log(`[WhatsApp Queue] Sending appointment confirmation to client:`, message.toPhoneNumber);
            result = await this.sendAppointmentConfirmationDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.userId
            );
            console.log(`[WhatsApp Queue] Client appointment confirmation result:`, result);
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
          case 'appointment_cancellation':
            result = await this.sendAppointmentCancellationDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.userId
            );
            break;
          case 'appointment_rescheduled':
            result = await this.sendAppointmentRescheduledDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.userId
            );
            break;
          case 'appointment_reminder':
            result = await this.sendAppointmentReminderDirect(
              message.toPhoneNumber,
              message.appointmentData,
              message.appointmentId,
              message.userId
            );
            break;
        }

        if (result.success) {
          console.log(`[WhatsApp Queue] ✅ Message sent successfully:`, {
            type: message.type,
            messageId: result.messageId,
            toPhoneNumber: message.toPhoneNumber,
            usedTemplate: result.usedTemplate || false
          });
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
    console.log(`[WhatsApp Queue] ✅ Queue processing completed. Remaining messages: ${this.messageQueue.length}`);
    
    // Check if new messages were added during processing
    if (this.messageQueue.length > 0) {
      console.log(`[WhatsApp Queue] 🔄 Restarting queue processing for ${this.messageQueue.length} remaining messages`);
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
   * Prepare template parameters for appointment confirmation
   * @param {Object} appointmentData - Appointment details
   * @returns {Array} Template parameters array
   */
  prepareAppointmentConfirmationTemplateParams(appointmentData) {
    const {
      userName,
      therapistName,
      appointmentDate,
      appointmentTime,
      timezone,
      appointmentType,
      duration,
      bookingAmount = 0,
      feeCurrency = 'INR'
    } = appointmentData;

    // Format date and time
    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    
    if (!appointmentTime && appointmentDate) {
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

    // Base parameters (always included)
    const baseParams = [
      userName || 'there',
      displayDate || appointmentDate,
      displayTime || appointmentTime,
      therapistName || 'Your therapist',
      appointmentType || 'Therapy Session',
      `${duration || 60} minutes`
    ];

    // Add payment status as 7th parameter only if enabled
    if (this.includePaymentStatusInTemplate) {
      const bookingAmountNum = parseFloat(bookingAmount) || 0;
      const paymentStatus = bookingAmountNum === 0 
        ? 'Booking made without payment' 
        : `Booking amount: ${feeCurrency} ${bookingAmountNum.toFixed(2)}`;
      baseParams.push(paymentStatus);
    }

    // Return parameters in order
    // If includePaymentStatusInTemplate is false: {{1}} = User Name, {{2}} = Date, {{3}} = Time, {{4}} = Therapist Name, {{5}} = Appointment Type, {{6}} = Duration
    // If includePaymentStatusInTemplate is true: {{1}} = User Name, {{2}} = Date, {{3}} = Time, {{4}} = Therapist Name, {{5}} = Appointment Type, {{6}} = Duration, {{7}} = Payment Status
    return baseParams;
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
      duration,
      bookingAmount = 0,
      feeCurrency = 'INR'
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
    
    // Add payment status information
    const bookingAmountNum = parseFloat(bookingAmount) || 0;
    const paymentInfo = bookingAmountNum === 0 
      ? '💰 *Payment:* Booking made without payment'
      : `💰 *Payment:* Booking amount: ${feeCurrency} ${bookingAmountNum.toFixed(2)}`;

    return `🎉 *Appointment Confirmed!* 🎉

Hi ${userName || 'there'},

Your therapy session has been successfully booked:

📅 *Date:* ${displayDate}
🕐 *Time:* ${displayTime} (${timeZoneDisplay})
👨‍⚕️ *Therapist:* ${therapistName || 'Your therapist'}
🏥 *Type:* ${appointmentType || 'Therapy Session'}
⏱️ *Duration:* ${duration || 60} minutes
${paymentInfo}

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
   * Send WhatsApp message using template
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {string} templateName - Template name
   * @param {Array} templateParams - Template parameters
   * @param {string} languageCode - Language code (default: 'en_US')
   * @returns {Promise<Object>} Result with message ID or error
   */
  async sendTemplateMessage(toPhoneNumber, templateName, templateParams, languageCode = null) {
    const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
    const toNumber = toPhoneNumber.replace('+', '');
    
    // Use configured locale if not provided
    const locale = languageCode || this.templateLocale || 'en_US';
    
    // Prepend namespace to template name if configured
    // WhatsApp expects format: "namespace:template_name" or just "template_name"
    let fullTemplateName = templateName;
    if (this.templateNamespace && !templateName.includes(':')) {
      fullTemplateName = `${this.templateNamespace}:${templateName}`;
    }
    
    // Log template details for debugging
    console.log('[WhatsApp Template] Sending template message:');
    console.log('  - Template Name (original):', templateName);
    console.log('  - Template Name (with namespace):', fullTemplateName);
    console.log('  - Namespace:', this.templateNamespace || 'NOT SET');
    console.log('  - Parameters Count:', templateParams.length);
    console.log('  - Parameters:', templateParams.map((p, i) => `[${i + 1}] "${p}"`).join(', '));
    console.log('  - From:', fromNumber);
    console.log('  - To:', toNumber);
    console.log('  - Locale:', locale);
    
    // Vonage expects parameters as array of strings, not objects
    // Error message: "Only array of strings is allowed. E.g. [\"param1\", \"param2\"]"
    const templatePayload = {
      name: fullTemplateName,
      parameters: templateParams.map(param => String(param)) // Array of strings
    };
    
    try {
      if (this.vonageClient) {
        // Use Vonage SDK with JWT authentication
        const result = await this.vonageClient.messages.send({
          message_type: 'template',
          channel: 'whatsapp',
          to: toNumber,
          from: fromNumber,
          template: templatePayload,
          whatsapp: {
            policy: 'deterministic',
            locale: locale
          }
        });
        
        // Vonage SDK response structure - check messageUUID first (camelCase, which is what Vonage SDK actually returns)
        const messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id || result?.messageId || result?.uuid;
        console.log('[WhatsApp Template] Template API call completed. Full result:', JSON.stringify(result, null, 2));
        console.log('[WhatsApp Template] Extracted message ID:', messageId);
        
        // Check if the response indicates success - Vonage SDK returns messageUUID (camelCase)
        if (messageId) {
          console.log('[WhatsApp Template] ✅ Template message sent successfully via Vonage SDK');
          return { success: true, messageId: messageId };
        } else if (result && Object.keys(result).length > 0) {
          // Response exists but no message ID found in any expected field
          console.error('[WhatsApp Template] ⚠️  Template API returned response but no message ID found');
          console.error('[WhatsApp Template] Response keys:', Object.keys(result));
          console.error('[WhatsApp Template] Response structure:', JSON.stringify(result, null, 2));
          throw new Error('Template message sent but no message ID in response. Response: ' + JSON.stringify(result));
        } else {
          console.error('[WhatsApp Template] ❌ Template API returned empty or invalid response');
          throw new Error('Template message failed - empty response from Vonage SDK');
        }
      } else {
        // Fallback to Basic Auth with direct API call
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        
        // Log the exact payload being sent
        console.log('[WhatsApp Template] Direct API Payload:', JSON.stringify({
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'template',
          template: templatePayload,
          whatsapp: {
            policy: 'deterministic',
            locale: locale
          }
        }, null, 2));
        
        const response = await axios.post(this.baseUrl, {
          from: fromNumber,
          to: toNumber,
          channel: 'whatsapp',
          message_type: 'template',
          template: templatePayload,
          whatsapp: {
            policy: 'deterministic',
            locale: locale
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
        
        const messageId = response.data?.message_uuid || response.data?.messageUuid || response.data?.message_id;
        console.log('[WhatsApp Template] Template message sent successfully. Full response:', JSON.stringify(response.data, null, 2));
        console.log('[WhatsApp Template] Extracted message ID:', messageId);
        
        if (!messageId) {
          console.warn('[WhatsApp Template] Warning: Could not extract message ID from API response. Response structure:', Object.keys(response.data || {}));
        }
        
        return { success: true, messageId: messageId };
      }
    } catch (error) {
      // Log raw error for debugging
      console.error('[WhatsApp Template] Raw error object:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
        hasResponse: !!error.response,
        hasBody: !!error.body,
        hasData: !!error.data,
        errorKeys: Object.keys(error)
      });
      
      // Try to extract error from various possible locations
      let rawErrorData = null;
      if (error.response) {
        console.error('[WhatsApp Template] Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          hasData: !!error.response.data,
          dataType: typeof error.response.data,
          dataKeys: error.response.data ? Object.keys(error.response.data) : []
        });
        rawErrorData = error.response.data;
      } else if (error.body) {
        console.error('[WhatsApp Template] Error body:', {
          bodyType: typeof error.body,
          isBuffer: Buffer.isBuffer(error.body),
          bodyKeys: typeof error.body === 'object' ? Object.keys(error.body) : []
        });
        rawErrorData = error.body;
      } else if (error.data) {
        console.error('[WhatsApp Template] Error data:', {
          dataType: typeof error.data,
          isBuffer: Buffer.isBuffer(error.data),
          dataKeys: typeof error.data === 'object' ? Object.keys(error.data) : []
        });
        rawErrorData = error.data;
      }
      // Try to parse raw error data if available
      let parsedErrorData = null;
      if (rawErrorData) {
        try {
          if (Buffer.isBuffer(rawErrorData)) {
            const bufferString = rawErrorData.toString();
            console.error('[WhatsApp Template] Raw error (Buffer):', bufferString.substring(0, 1000));
            parsedErrorData = JSON.parse(bufferString);
          } else if (typeof rawErrorData === 'string') {
            console.error('[WhatsApp Template] Raw error (string):', rawErrorData.substring(0, 1000));
            parsedErrorData = JSON.parse(rawErrorData);
          } else if (typeof rawErrorData === 'object' && rawErrorData !== null) {
            parsedErrorData = rawErrorData;
          }
        } catch (parseError) {
          console.error('[WhatsApp Template] Could not parse raw error data:', parseError.message);
        }
      }
      
      // Enhanced error logging
      const errorDetails = this.extractErrorDetails(error);
      console.error('[WhatsApp Template] Template message failed:');
      console.error('  - Template Name:', templateName);
      console.error('  - Parameters Count:', templateParams.length);
      console.error('  - Parameters:', JSON.stringify(templateParams, null, 2));
      console.error('  - Error Status:', errorDetails.status || errorDetails.statusCode);
      console.error('  - Error Message:', error.message);
      
      // Log parsed error data if we successfully parsed it
      if (parsedErrorData) {
        console.error('  - Parsed Error Data:', JSON.stringify(parsedErrorData, null, 2));
        if (parsedErrorData.title) {
          console.error('  - Error Title:', parsedErrorData.title);
        }
        if (parsedErrorData.detail) {
          console.error('  - Error Detail:', parsedErrorData.detail);
        }
        if (parsedErrorData.invalid_parameters) {
          console.error('  - Invalid Parameters:', JSON.stringify(parsedErrorData.invalid_parameters, null, 2));
        }
        if (parsedErrorData.errors) {
          console.error('  - Errors:', JSON.stringify(parsedErrorData.errors, null, 2));
        }
      }
      
      // Log extracted error details (fallback)
      if (errorDetails.details) {
        console.error('  - Extracted Error Details:', JSON.stringify(errorDetails.details, null, 2));
        if (errorDetails.details.title) {
          console.error('  - Extracted Error Title:', errorDetails.details.title);
        }
        if (errorDetails.details.detail) {
          console.error('  - Extracted Error Detail:', errorDetails.details.detail);
        }
        if (errorDetails.details.invalid_parameters) {
          console.error('  - Extracted Invalid Parameters:', JSON.stringify(errorDetails.details.invalid_parameters, null, 2));
        }
        if (errorDetails.details.errors) {
          console.error('  - Extracted Errors:', JSON.stringify(errorDetails.details.errors, null, 2));
        }
      }
      
      // Also log from errorDetails directly
      if (errorDetails.title) {
        console.error('  - Error Title (from errorDetails):', errorDetails.title);
      }
      if (errorDetails.detail) {
        console.error('  - Error Detail (from errorDetails):', errorDetails.detail);
      }
      
      // Re-throw to allow fallback handling
      throw error;
    }
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
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      let usedTemplate = false;
      
      // Try template first if configured (use theraptrack_appointment_is_booked)
      if (this.useTemplates && this.templateNames.appointmentConfirmation) {
        try {
          console.log('[WhatsApp Service] 🎯 Attempting to send appointment confirmation via template:', this.templateNames.appointmentConfirmation);
          console.log('[WhatsApp Service] Template configuration:', {
            useTemplates: this.useTemplates,
            templateName: this.templateNames.appointmentConfirmation,
            enabled: this.enabled
          });
          
          const templateParams = this.prepareAppointmentConfirmationTemplateParams(appointmentData);
          console.log('[WhatsApp Service] Prepared template parameters:', {
            count: templateParams.length,
            params: templateParams,
            includePaymentStatus: this.includePaymentStatusInTemplate
          });
          
          const templateResult = await this.sendTemplateMessage(
            toPhoneNumber,
            this.templateNames.appointmentConfirmation,
            templateParams,
            'en'
          );
          
          messageId = templateResult.messageId;
          usedTemplate = true;
          console.log('[WhatsApp Service] ✅ Template message sent successfully. Message ID:', messageId);
          console.log('[WhatsApp Service] Template result:', templateResult);
          
          // If messageId is still undefined, log warning but continue
          if (!messageId) {
            console.warn('[WhatsApp Service] ⚠️  Warning: Template message sent but messageId is undefined. This might indicate the message was queued or the response structure is different.');
          }
        } catch (templateError) {
          const errorDetails = this.extractErrorDetails(templateError);
          console.error('[WhatsApp Service] Template message failed, falling back to text message');
          console.error('[WhatsApp Service] Error Summary:', {
            status: errorDetails.status || errorDetails.statusCode,
            message: templateError.message,
            title: errorDetails.title || errorDetails.details?.title,
            detail: errorDetails.detail || errorDetails.details?.detail,
            invalid_parameters: errorDetails.invalid_parameters || errorDetails.details?.invalid_parameters
          });
          
          // If error is about parameter count, log helpful message
          if (errorDetails.detail && errorDetails.detail.includes('parameter')) {
            console.error('[WhatsApp Service] ⚠️  PARAMETER COUNT MISMATCH DETECTED:');
            console.error(`  - Template "${this.templateNames.appointmentConfirmation}" expects different number of parameters`);
            console.error(`  - Currently sending: ${templateParams.length} parameters`);
            console.error(`  - includePaymentStatusInTemplate: ${this.includePaymentStatusInTemplate}`);
            console.error('  - SOLUTION: Set WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=false in .env if template has 6 parameters');
            console.error('  - OR: Update template in WhatsApp Manager to have 7 parameters');
          }
          
          // Fall through to text message
        }
      }
      
      // Fallback to text message if template not used or failed
      if (!usedTemplate) {
        console.log('[WhatsApp Service] 📝 Template not used, sending appointment confirmation as text message');
        console.log('[WhatsApp Service] Reason template not used:', {
          useTemplates: this.useTemplates,
          hasTemplateName: !!this.templateNames.appointmentConfirmation,
          templateName: this.templateNames.appointmentConfirmation
        });
        const messageBody = this.createAppointmentMessage(appointmentData);
        
        if (this.vonageClient) {
          // Use Vonage SDK with JWT authentication
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: messageBody
          });
          // Extract message ID - Vonage SDK returns messageUUID (camelCase)
          messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
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
      }

      // Log successful notification with template usage info
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'sent',
        messageId,
        null
      );

      const messageType = usedTemplate ? 'Template' : 'Text';
      console.log(`[WhatsApp Service] ✅ Message sent successfully: ${messageId} (${messageType})`);
      console.log(`[WhatsApp Service] Message details:`, {
        messageId: messageId,
        usedTemplate: usedTemplate,
        toPhoneNumber: toPhoneNumber,
        appointmentId: appointmentId,
        userId: userId
      });
      
      // Return result with template usage indicator
      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        usedTemplate: usedTemplate,
        messageType: messageType
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
        // Extract message ID - Vonage SDK returns messageUUID (camelCase)
        messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
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

      console.log(`[WhatsApp Service] ✅ Therapist notification sent successfully. Message ID: ${messageId}`);
      console.log(`[WhatsApp Service] Therapist message details:`, {
        messageId: messageId,
        toPhoneNumber: toPhoneNumber,
        appointmentId: appointmentId,
        partnerId: partnerId
      });

      return {
        success: true,
        messageId: messageId,
        status: 'sent',
        usedTemplate: false,
        messageType: 'Text'
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
   * Send WhatsApp appointment cancellation notification (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentCancellation(toPhoneNumber, appointmentData, appointmentId, userId) {
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
      await this.logNotification(appointmentId, userId, toPhoneNumber, 'failed', null, error, 'appointment_cancellation');
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'appointment_cancellation',
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
   * Send WhatsApp appointment cancellation directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentCancellationDirect(toPhoneNumber, appointmentData, appointmentId, userId) {
    try {
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      let usedTemplate = false;
      
      // Try template first if configured
      if (this.useTemplates && this.templateNames.appointmentCancellation) {
        try {
          console.log('[WhatsApp Service] 🎯 Attempting to send appointment cancellation via template:', this.templateNames.appointmentCancellation);
          const templateParams = this.prepareAppointmentConfirmationTemplateParams(appointmentData);
          console.log('[WhatsApp Service] Cancellation template parameters:', {
            count: templateParams.length,
            params: templateParams
          });
          
          const templateResult = await this.sendTemplateMessage(
            toPhoneNumber,
            this.templateNames.appointmentCancellation,
            templateParams,
            'en'
          );
          messageId = templateResult.messageId;
          usedTemplate = true;
          console.log('[WhatsApp Service] ✅ Cancellation template message sent successfully. Message ID:', messageId);
          console.log('[WhatsApp Service] Cancellation template result:', templateResult);
        } catch (templateError) {
          const errorDetails = this.extractErrorDetails(templateError);
          console.error('[WhatsApp Service] ❌ Cancellation template message failed, falling back to text');
          console.error('[WhatsApp Service] Cancellation template error:', {
            status: errorDetails.status || errorDetails.statusCode,
            message: templateError.message,
            title: errorDetails.title || errorDetails.details?.title,
            detail: errorDetails.detail || errorDetails.details?.detail
          });
          // Fall through to text message
        }
      } else {
        console.log('[WhatsApp Service] Cancellation template not configured, using text message');
      }
      
      // Fallback to text message if template not used or failed
      if (!usedTemplate) {
        console.log('[WhatsApp Service] Sending appointment cancellation as text message');
        const messageBody = this.createAppointmentCancellationMessage(appointmentData);
        
        if (this.vonageClient) {
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: messageBody
          });
          // Extract message ID - Vonage SDK returns messageUUID (camelCase)
        messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
        } else {
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
      }

      // Log successful notification
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'sent',
        messageId,
        null,
        'appointment_cancellation'
      );

      console.log(`[WhatsApp Service] Cancellation message sent successfully: ${messageId} (${usedTemplate ? 'Template' : 'Text'})`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send cancellation message:', error.message);
      
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details),
        'appointment_cancellation'
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
   * Send WhatsApp appointment rescheduling notification (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details (should include oldDate and newDate)
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentRescheduled(toPhoneNumber, appointmentData, appointmentId, userId) {
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
      await this.logNotification(appointmentId, userId, toPhoneNumber, 'failed', null, error, 'appointment_rescheduled');
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'appointment_rescheduled',
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
   * Send WhatsApp appointment rescheduling directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentRescheduledDirect(toPhoneNumber, appointmentData, appointmentId, userId) {
    try {
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      let usedTemplate = false;
      
      // Try template first if configured
      if (this.useTemplates && this.templateNames.appointmentRescheduled) {
        try {
          console.log('[WhatsApp Service] Attempting to send appointment rescheduled via template:', this.templateNames.appointmentRescheduled);
          const templateParams = this.prepareAppointmentConfirmationTemplateParams(appointmentData);
          const templateResult = await this.sendTemplateMessage(
            toPhoneNumber,
            this.templateNames.appointmentRescheduled,
            templateParams,
            'en'
          );
          messageId = templateResult.messageId;
          usedTemplate = true;
          console.log('[WhatsApp Service] Template message sent successfully:', messageId);
        } catch (templateError) {
          console.warn('[WhatsApp Service] Template message failed, falling back to text:', templateError.message);
          // Fall through to text message
        }
      }
      
      // Fallback to text message if template not used or failed
      if (!usedTemplate) {
        console.log('[WhatsApp Service] Sending appointment rescheduled as text message');
        const messageBody = this.createAppointmentRescheduledMessage(appointmentData);
        
        if (this.vonageClient) {
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: messageBody
          });
          // Extract message ID - Vonage SDK returns messageUUID (camelCase)
        messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
        } else {
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
      }

      // Log successful notification
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'sent',
        messageId,
        null,
        'appointment_rescheduled'
      );

      console.log(`[WhatsApp Service] Rescheduled message sent successfully: ${messageId} (${usedTemplate ? 'Template' : 'Text'})`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send rescheduled message:', error.message);
      
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details),
        'appointment_rescheduled'
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
   * Send WhatsApp appointment reminder notification (adds to queue for rate limiting)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentReminder(toPhoneNumber, appointmentData, appointmentId, userId) {
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
      await this.logNotification(appointmentId, userId, toPhoneNumber, 'failed', null, error, 'appointment_reminder');
      return {
        success: false,
        error: error
      };
    }

    // Add to queue instead of sending directly
    this.addToQueue({
      type: 'appointment_reminder',
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
   * Send WhatsApp appointment reminder directly (internal use)
   * @param {string} toPhoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @param {number} appointmentId - Appointment ID for logging
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Result with status and message ID
   */
  async sendAppointmentReminderDirect(toPhoneNumber, appointmentData, appointmentId, userId) {
    try {
      const fromNumber = this.fromNumber.startsWith('+') ? this.fromNumber.substring(1) : this.fromNumber;
      const toNumber = toPhoneNumber.replace('+', '');
      
      let messageId;
      let usedTemplate = false;
      
      // Try template first if configured
      if (this.useTemplates && this.templateNames.appointmentReminder) {
        try {
          console.log('[WhatsApp Service] Attempting to send appointment reminder via template:', this.templateNames.appointmentReminder);
          const templateParams = this.prepareAppointmentConfirmationTemplateParams(appointmentData);
          const templateResult = await this.sendTemplateMessage(
            toPhoneNumber,
            this.templateNames.appointmentReminder,
            templateParams,
            'en'
          );
          messageId = templateResult.messageId;
          usedTemplate = true;
          console.log('[WhatsApp Service] Template message sent successfully:', messageId);
        } catch (templateError) {
          console.warn('[WhatsApp Service] Template message failed, falling back to text:', templateError.message);
          // Fall through to text message
        }
      }
      
      // Fallback to text message if template not used or failed
      if (!usedTemplate) {
        console.log('[WhatsApp Service] Sending appointment reminder as text message');
        const messageBody = this.createAppointmentReminderMessage(appointmentData);
        
        if (this.vonageClient) {
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: messageBody
          });
          // Extract message ID - Vonage SDK returns messageUUID (camelCase)
        messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
        } else {
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
      }

      // Log successful notification
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'sent',
        messageId,
        null,
        'appointment_reminder'
      );

      console.log(`[WhatsApp Service] Reminder message sent successfully: ${messageId} (${usedTemplate ? 'Template' : 'Text'})`);

      return {
        success: true,
        messageId: messageId,
        status: 'sent'
      };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      
      console.error('[WhatsApp Service] Failed to send reminder message:', error.message);
      
      await this.logNotification(
        appointmentId,
        userId,
        toPhoneNumber,
        'failed',
        null,
        typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details),
        'appointment_reminder'
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
   * Create WhatsApp appointment cancellation message
   * @param {Object} appointmentData - Appointment details
   * @returns {string} Formatted message
   */
  createAppointmentCancellationMessage(appointmentData) {
    const {
      userName,
      therapistName,
      appointmentDate,
      appointmentTime,
      timezone,
      appointmentType
    } = appointmentData;

    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    
    if (!appointmentTime && appointmentDate) {
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

    return `❌ *Appointment Cancelled* ❌

Hi ${userName || 'there'},

Your appointment has been cancelled:

📅 *Date:* ${displayDate}
🕐 *Time:* ${displayTime}
👨‍⚕️ *Therapist:* ${therapistName || 'Your therapist'}
🏥 *Type:* ${appointmentType || 'Therapy Session'}

If you need to reschedule, please contact your therapist.

— *TheraP Track Team*`;
  }

  /**
   * Create WhatsApp appointment rescheduled message
   * @param {Object} appointmentData - Appointment details
   * @returns {string} Formatted message
   */
  createAppointmentRescheduledMessage(appointmentData) {
    const {
      userName,
      therapistName,
      appointmentDate,
      appointmentTime,
      oldDate,
      oldTime,
      timezone,
      appointmentType,
      duration
    } = appointmentData;

    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    let oldDisplayTime = oldTime;
    let oldDisplayDate = oldDate;
    
    if (!appointmentTime && appointmentDate) {
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

    if (oldDate) {
      if (!oldTime) {
        const oldDateObj = new Date(oldDate);
        const localTimezone = timezone || 'Asia/Kolkata';
        
        oldDisplayTime = oldDateObj.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: localTimezone
        });
        
        oldDisplayDate = oldDateObj.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: localTimezone
        });
      } else {
        const oldDateObj = new Date(oldDate);
        const localTimezone = timezone || 'Asia/Kolkata';
        
        oldDisplayDate = oldDateObj.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: localTimezone
        });
      }
    }

    return `🔄 *Appointment Rescheduled* 🔄

Hi ${userName || 'there'},

Your appointment has been rescheduled:

❌ *Previous:*
📅 ${oldDisplayDate || 'N/A'}
🕐 ${oldDisplayTime || 'N/A'}

✅ *New:*
📅 ${displayDate}
🕐 ${displayTime}
👨‍⚕️ *Therapist:* ${therapistName || 'Your therapist'}
🏥 *Type:* ${appointmentType || 'Therapy Session'}
⏱️ *Duration:* ${duration || 60} minutes

Please update your calendar.

— *TheraP Track Team*`;
  }

  /**
   * Create WhatsApp appointment reminder message
   * @param {Object} appointmentData - Appointment details
   * @returns {string} Formatted message
   */
  createAppointmentReminderMessage(appointmentData) {
    const {
      userName,
      therapistName,
      appointmentDate,
      appointmentTime,
      timezone,
      appointmentType,
      duration
    } = appointmentData;

    let displayTime = appointmentTime;
    let displayDate = appointmentDate;
    
    if (!appointmentTime && appointmentDate) {
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

    return `⏰ *Appointment Reminder* ⏰

Hi ${userName || 'there'},

This is a reminder about your upcoming appointment:

📅 *Date:* ${displayDate}
🕐 *Time:* ${displayTime} (${timezone || 'IST'})
👨‍⚕️ *Therapist:* ${therapistName || 'Your therapist'}
🏥 *Type:* ${appointmentType || 'Therapy Session'}
⏱️ *Duration:* ${duration || 60} minutes

Your appointment is in 4 hours. Please arrive 5 minutes early.

See you soon! 😊

— *TheraP Track Team*`;
  }

  /**
   * Log WhatsApp notification to database
   * @param {number} appointmentId - Appointment ID
   * @param {number} userId - User ID
   * @param {string} phoneNumber - Phone number
   * @param {string} status - Notification status
   * @param {string} messageId - Vonage message ID
   * @param {string} errorMessage - Error message if failed
   * @param {string} messageType - Type of message (default: 'appointment_confirmation')
   */
  async logNotification(appointmentId, userId, phoneNumber, status, messageId = null, errorMessage = null, messageType = 'appointment_confirmation') {
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
        messageType,
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
    // Check if service is configured (has either JWT or Basic Auth credentials)
    const hasJWTAuth = !!(this.applicationId && this.privateKey);
    const hasBasicAuth = !!(this.apiKey && this.apiSecret);
    const isConfigured = (hasJWTAuth || hasBasicAuth) && !!this.fromNumber;
    
    // Debug logging for status check
    console.log('[WhatsApp Service] Status check:');
    console.log('  - Enabled:', this.enabled);
    console.log('  - Has Application ID:', !!this.applicationId);
    console.log('  - Has Private Key:', !!this.privateKey);
    console.log('  - Has API Key:', !!this.apiKey);
    console.log('  - Has API Secret:', !!this.apiSecret);
    console.log('  - Has From Number:', !!this.fromNumber);
    console.log('  - Has JWT Auth:', hasJWTAuth);
    console.log('  - Has Basic Auth:', hasBasicAuth);
    console.log('  - Is Configured:', isConfigured);
    
    return {
      enabled: this.enabled,
      configured: isConfigured,
      fromNumber: this.fromNumber,
      authMethod: hasJWTAuth ? 'JWT' : (hasBasicAuth ? 'Basic' : 'None'),
      hasVonageClient: !!this.vonageClient,
      // Debug info (can be removed later)
      debug: {
        hasApplicationId: !!this.applicationId,
        hasPrivateKey: !!this.privateKey,
        hasApiKey: !!this.apiKey,
        hasApiSecret: !!this.apiSecret,
        hasFromNumber: !!this.fromNumber
      }
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
        console.log('[WhatsApp Service] Sending message with params:', {
          message_type: 'text',
          channel: 'whatsapp',
          to: toNumber,
          from: fromNumber
        });
        
        // Use Vonage SDK to send message (it handles JWT automatically)
        try {
          const result = await this.vonageClient.messages.send({
            message_type: 'text',
            channel: 'whatsapp',
            to: toNumber,
            from: fromNumber,
            text: '🧪 *TheraP Track WhatsApp Test*\n\nThis is a test message from your TheraP Track system. If you received this, your WhatsApp integration is working correctly! ✅'
          });
          
          console.log('[WhatsApp Service] SDK send result:', result);
          response = { data: { message_uuid: result.message_uuid } };
        } catch (sdkError) {
          // If SDK fails, log detailed error and throw
          console.error('[WhatsApp Service] SDK send error:', sdkError);
          console.error('[WhatsApp Service] SDK error message:', sdkError.message);
          console.error('[WhatsApp Service] SDK error response:', sdkError.response?.data);
          console.error('[WhatsApp Service] SDK error body:', sdkError.body);
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
        // Extract message ID - Vonage SDK returns messageUUID (camelCase)
        messageId = result?.messageUUID || result?.message_uuid || result?.messageUuid || result?.message_id;
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
      details: null,
      title: null,
      detail: null
    };

    // Try to extract detailed error information
    let errorData = null;
    
    // Check if error.response.data exists and handle Buffer/stream cases
    if (error.response?.data) {
      const data = error.response.data;
      
      // Handle Buffer data nested in _readableState (common in Vonage SDK errors)
      if (data._readableState?.buffer && Array.isArray(data._readableState.buffer) && data._readableState.buffer.length > 0) {
        try {
          const buffer = data._readableState.buffer[0];
          if (buffer && buffer.data) {
            // buffer.data can be an array of numbers (Buffer bytes) or a Buffer
            if (Array.isArray(buffer.data)) {
              // Convert array of byte values to Buffer, then to string, then parse JSON
              const bufferString = Buffer.from(buffer.data).toString('utf8');
              errorData = JSON.parse(bufferString);
            } else if (Buffer.isBuffer(buffer.data)) {
              errorData = JSON.parse(buffer.data.toString('utf8'));
            } else {
              errorData = buffer.data;
            }
          } else {
            errorData = data;
          }
        } catch (e) {
          console.error('[WhatsApp Service] Failed to parse buffer error data:', e.message);
          // If buffer parsing fails, try to use data as-is
          errorData = data;
        }
      } 
      // Handle regular object/string data
      else if (typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
        errorData = data;
      }
      // Handle Buffer directly
      else if (Buffer.isBuffer(data)) {
        try {
          errorData = JSON.parse(data.toString('utf8'));
        } catch {
          errorData = data.toString('utf8');
        }
      }
      // Handle string data
      else if (typeof data === 'string') {
        try {
          errorData = JSON.parse(data);
        } catch {
          errorData = data;
        }
      }
      else {
        errorData = data;
      }
      details.details = errorData;
    } 
    // Check error.response.body
    else if (error.response?.body) {
      try {
        if (Buffer.isBuffer(error.response.body)) {
          errorData = JSON.parse(error.response.body.toString());
        } else if (typeof error.response.body === 'string') {
          errorData = JSON.parse(error.response.body);
        } else {
          errorData = error.response.body;
        }
        details.details = errorData;
      } catch {
        details.details = error.response.body;
        errorData = error.response.body;
      }
    } 
    // Check error.body directly
    else if (error.body) {
      try {
        if (Buffer.isBuffer(error.body)) {
          errorData = JSON.parse(error.body.toString());
        } else if (typeof error.body === 'string') {
          errorData = JSON.parse(error.body);
        } else {
          errorData = error.body;
        }
        details.details = errorData;
      } catch {
        details.details = error.body;
        errorData = error.body;
      }
    }

    // Extract readable error fields
    if (errorData) {
      if (typeof errorData === 'object' && errorData !== null) {
        details.title = errorData.title || null;
        details.detail = errorData.detail || errorData.message || null;
        details.invalid_parameters = errorData.invalid_parameters || null;
        details.errors = errorData.errors || null;
      } else if (typeof errorData === 'string') {
        try {
          const parsed = JSON.parse(errorData);
          details.title = parsed.title || null;
          details.detail = parsed.detail || parsed.message || null;
          details.invalid_parameters = parsed.invalid_parameters || null;
          details.errors = parsed.errors || null;
        } catch {
          details.detail = errorData;
        }
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