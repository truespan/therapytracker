const brevo = require('@getbrevo/brevo');

// Initialize Brevo API client
const getBrevoApiInstance = () => {
  // Check if Brevo API key is configured
  if (!process.env.BREVO_API_KEY) {
    console.warn('Email service not configured. Set BREVO_API_KEY in .env');
    return null;
  }

  // Verify API key format (should not be empty and should have some length)
  const apiKeyValue = process.env.BREVO_API_KEY.trim();
  if (!apiKeyValue || apiKeyValue.length < 10) {
    console.error('BREVO_API_KEY appears to be invalid or too short');
    return null;
  }

  // Create API instance
  const apiInstance = new brevo.TransactionalEmailsApi();
  
  // Configure API key on the instance
  apiInstance.authentications['apiKey'].apiKey = apiKeyValue;

  return apiInstance;
};

const sendPasswordResetEmail = async (email, token) => {
  const apiInstance = getBrevoApiInstance();
  
  if (!apiInstance) {
    throw new Error('Email service not configured');
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const htmlContent = `
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
          <p>We received a request to reset your password for your TheraP Track account.</p>
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
          <p>This is an automated email from TheraP Track. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Password Reset Request
    
    Hello,
    
    We received a request to reset your password for your TheraP Track account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    
    This is an automated email from TheraP Track.
  `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: 'vakshreem@gmail.com', name: 'TheraP Track' };
  sendSmtpEmail.to = [{ email: email }];
  sendSmtpEmail.subject = 'Password Reset Request - TheraP Track';
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Password reset email sent:', data.messageId);
    return data;
  } catch (error) {
    // Provide more helpful error messages
    let errorMessage = 'Failed to send password reset email';
    
    if (error.response) {
      // Brevo API error response
      const statusCode = error.response.statusCode || error.response.status;
      const errorBody = error.response.body || error.response.text || {};
      
      if (statusCode === 401 || statusCode === 403) {
        errorMessage = 'Authentication failed: Invalid BREVO_API_KEY. Please check your API key configuration.';
        console.error('Error sending password reset email:', errorMessage);
        console.error('Brevo API authentication error details:', {
          statusCode: statusCode,
          errorBody: errorBody,
          apiKeyLength: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
          apiKeyPrefix: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 4) + '...' : 'not set'
        });
      } else if (statusCode === 400) {
        errorMessage = `Invalid request: ${errorBody.message || 'Please check email address and request format.'}`;
        console.error('Error sending password reset email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      } else if (statusCode >= 500) {
        errorMessage = 'Email service temporarily unavailable. Please try again later.';
        console.error('Error sending password reset email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      } else {
        errorMessage = errorBody.message || `Failed to send email. Status: ${statusCode}`;
        console.error('Error sending password reset email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      }
    } else if (error.message) {
      console.error('Error sending password reset email:', error);
      errorMessage = error.message || 'Unknown error occurred while sending email';
    } else {
      console.error('Error sending password reset email:', error);
      errorMessage = 'Unknown error occurred while sending email';
    }
    
    throw new Error(errorMessage);
  }
};

const sendPartnerVerificationEmail = async (email, token) => {
  const apiInstance = getBrevoApiInstance();

  if (!apiInstance) {
    throw new Error('Email service not configured');
  }

  // Always use frontend URL so users see the UI, not raw JSON
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}&type=partner`;

  const htmlContent = `
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
          <h1>Welcome to TheraP Track</h1>
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
          <p>This is an automated email from TheraP Track. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Welcome to TheraP Track

    Hello,

    Your therapist account has been created by your organization. Please verify your email address to activate your account and start using the platform.

    Click the link below to verify your email:
    ${verificationUrl}

    This verification link will expire in 1 hour. You must verify your email before you can log in to your account.

    If you didn't expect this email or have any questions, please contact your organization administrator.

    This is an automated email from TheraP Track.
  `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: process.env.EMAIL_USER, name: 'TheraP Track' };
  sendSmtpEmail.to = [{ email: email }];
  sendSmtpEmail.subject = 'Verify Your Email - TheraP Track';
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Partner verification email sent:', data.messageId);
    return data;
  } catch (error) {
    // Provide more helpful error messages
    let errorMessage = 'Failed to send partner verification email';
    
    if (error.response) {
      // Brevo API error response
      const statusCode = error.response.statusCode || error.response.status;
      const errorBody = error.response.body || error.response.text || {};
      
      if (statusCode === 401 || statusCode === 403) {
        errorMessage = 'Authentication failed: Invalid BREVO_API_KEY. Please check your API key configuration.';
        console.error('Error sending partner verification email:', errorMessage);
        console.error('Brevo API authentication error details:', {
          statusCode: statusCode,
          errorBody: errorBody,
          apiKeyLength: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
          apiKeyPrefix: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 4) + '...' : 'not set'
        });
      } else if (statusCode === 400) {
        errorMessage = `Invalid request: ${errorBody.message || 'Please check email address and request format.'}`;
        console.error('Error sending partner verification email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      } else if (statusCode >= 500) {
        errorMessage = 'Email service temporarily unavailable. Please try again later.';
        console.error('Error sending partner verification email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      } else {
        errorMessage = errorBody.message || `Failed to send email. Status: ${statusCode}`;
        console.error('Error sending partner verification email:', errorMessage);
        console.error('Brevo API error details:', errorBody);
      }
    } else if (error.message) {
      console.error('Error sending partner verification email:', error);
      errorMessage = error.message || 'Unknown error occurred while sending email';
    } else {
      console.error('Error sending partner verification email:', error);
      errorMessage = 'Unknown error occurred while sending email';
    }
    
    throw new Error(errorMessage);
  }
};

const sendContactEmail = async (name, email, message) => {
  const apiInstance = getBrevoApiInstance();
  
  if (!apiInstance) {
    throw new Error('Email service not configured');
  }

  const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_USER || 'vakshreem@gmail.com';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #00897b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #00897b; border-radius: 3px; }
        .message-box { background-color: #fff; padding: 15px; margin: 15px 0; border: 1px solid #ddd; border-radius: 3px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
          <p>You have received a new contact form submission from TheraP Track website.</p>
          
          <div class="info-box">
            <strong>Name:</strong> ${name}<br>
            <strong>Email:</strong> ${email}
          </div>
          
          ${message ? `
          <div class="message-box">
            <strong>Message:</strong><br>
            ${message.replace(/\n/g, '<br>')}
          </div>
          ` : '<p><em>No message provided.</em></p>'}
          
          <p>Please respond to this inquiry at your earliest convenience.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from TheraP Track contact form.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    New Contact Form Submission
    
    You have received a new contact form submission from TheraP Track website.
    
    Name: ${name}
    Email: ${email}
    ${message ? `\nMessage:\n${message}` : '\nNo message provided.'}
    
    Please respond to this inquiry at your earliest convenience.
    
    This is an automated email from TheraP Track contact form.
  `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: 'vakshreem@gmail.com', name: 'TheraP Track Contact Form' };
  sendSmtpEmail.to = [{ email: contactEmail }];
  sendSmtpEmail.subject = `New Contact Form Submission from ${name}`;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.replyTo = { email: email, name: name };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Contact form email sent:', data.messageId);
    return data;
  } catch (error) {
    let errorMessage = 'Failed to send contact email';
    
    if (error.response) {
      const statusCode = error.response.statusCode || error.response.status;
      const errorBody = error.response.body || error.response.text || {};
      errorMessage = errorBody.message || `Failed to send email. Status: ${statusCode}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('Error sending contact email:', errorMessage);
    throw new Error(errorMessage);
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPartnerVerificationEmail,
  sendContactEmail
};
