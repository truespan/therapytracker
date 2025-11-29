const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Check if email service is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('Email service not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env');
    return null;
  }

  // Parse timeout values from environment or use defaults
  const connectionTimeout = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || '10000'); // 10 seconds
  const greetingTimeout = parseInt(process.env.EMAIL_GREETING_TIMEOUT || '5000'); // 5 seconds
  const socketTimeout = parseInt(process.env.EMAIL_SOCKET_TIMEOUT || '30000'); // 30 seconds

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Connection timeout options
    connectionTimeout: connectionTimeout, // How long to wait for initial connection
    greetingTimeout: greetingTimeout, // How long to wait for SMTP greeting
    socketTimeout: socketTimeout, // How long to wait for socket operations
    // Additional connection options
    pool: true, // Use connection pooling
    maxConnections: 1, // Maximum number of concurrent connections
    maxMessages: 3, // Maximum number of messages per connection
    // TLS options for better compatibility
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
    }
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Therapy Tracker',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Therapy Tracker account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
              ${resetUrl}
            </p>
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Therapy Tracker. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hello,
      
      We received a request to reset your password for your Therapy Tracker account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      
      This is an automated email from Therapy Tracker.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    // Provide more helpful error messages
    let errorMessage = 'Failed to send password reset email';
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ESOCKETTIMEDOUT') {
      errorMessage = 'Connection timeout: Unable to connect to email server. Please check your EMAIL_HOST and network connectivity.';
      console.error('Error sending password reset email:', errorMessage);
      console.error('Connection error details:', {
        code: error.command || error.code,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || '587',
        message: error.message
      });
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed: Invalid email credentials. Please check EMAIL_USER and EMAIL_PASSWORD.';
      console.error('Error sending password reset email:', errorMessage);
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      errorMessage = `DNS error: Cannot resolve email server hostname "${process.env.EMAIL_HOST}". Please check EMAIL_HOST.`;
      console.error('Error sending password reset email:', errorMessage);
    } else {
      console.error('Error sending password reset email:', error);
      errorMessage = error.message || 'Unknown error occurred while sending email';
    }
    
    throw new Error(errorMessage);
  }
};

const sendPartnerVerificationEmail = async (email, token) => {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}&type=partner`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email - Therapy Tracker',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Therapy Tracker</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your therapist account has been created by your organization. Please verify your email address to activate your account and start using the platform.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
              ${verificationUrl}
            </p>
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 1 hour. You must verify your email before you can log in to your account.
            </div>
            <p>If you didn't expect this email or have any questions, please contact your organization administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Therapy Tracker. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Therapy Tracker

      Hello,

      Your therapist account has been created by your organization. Please verify your email address to activate your account and start using the platform.

      Click the link below to verify your email:
      ${verificationUrl}

      This verification link will expire in 1 hour. You must verify your email before you can log in to your account.

      If you didn't expect this email or have any questions, please contact your organization administrator.

      This is an automated email from Therapy Tracker.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Partner verification email sent:', info.messageId);
    return info;
  } catch (error) {
    // Provide more helpful error messages
    let errorMessage = 'Failed to send partner verification email';
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ESOCKETTIMEDOUT') {
      errorMessage = 'Connection timeout: Unable to connect to email server. Please check your EMAIL_HOST and network connectivity.';
      console.error('Error sending partner verification email:', errorMessage);
      console.error('Connection error details:', {
        code: error.command || error.code,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || '587',
        message: error.message
      });
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed: Invalid email credentials. Please check EMAIL_USER and EMAIL_PASSWORD.';
      console.error('Error sending partner verification email:', errorMessage);
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      errorMessage = `DNS error: Cannot resolve email server hostname "${process.env.EMAIL_HOST}". Please check EMAIL_HOST.`;
      console.error('Error sending partner verification email:', errorMessage);
    } else {
      console.error('Error sending partner verification email:', error);
      errorMessage = error.message || 'Unknown error occurred while sending email';
    }
    
    throw new Error(errorMessage);
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPartnerVerificationEmail
};

