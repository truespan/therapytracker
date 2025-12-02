require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n=== Email Configuration Test ===\n');

// Check configuration
const config = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

console.log('Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  User: ${config.auth.user}`);
console.log(`  Password: ${config.auth.pass ? '***SET***' : 'NOT SET'}\n`);

// Check for placeholder values
const hasPlaceholders = 
  config.auth.user === 'your_email@gmail.com' || 
  config.auth.user === 'your.actual.email@gmail.com' ||
  config.auth.pass === 'your_16_char_app_password' ||
  config.auth.pass === 'abcdefghijklmnop';

if (hasPlaceholders) {
  console.log('❌ ERROR: You are using PLACEHOLDER values!\n');
  console.log('Please update backend/.env with your REAL Gmail credentials:\n');
  console.log('1. Go to https://myaccount.google.com/apppasswords');
  console.log('2. Generate an App Password');
  console.log('3. Update EMAIL_USER and EMAIL_PASSWORD in .env');
  console.log('4. Restart backend server\n');
  console.log('See FIX_EMAIL_ISSUE.md for detailed instructions.\n');
  process.exit(1);
}

// Test connection
console.log('Testing connection to email server...\n');

const transporter = nodemailer.createTransport(config);

transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Connection FAILED\n');
    console.log('Error:', error.message, '\n');
    
    if (error.message.includes('Invalid login')) {
      console.log('This means your credentials are incorrect.\n');
      console.log('For Gmail:');
      console.log('  - You MUST use an App Password (not your regular password)');
      console.log('  - Enable 2-Step Verification first');
      console.log('  - Generate App Password at: https://myaccount.google.com/apppasswords\n');
    }
    
    console.log('See FIX_EMAIL_ISSUE.md for detailed troubleshooting.\n');
    process.exit(1);
  } else {
    console.log('✅ Connection SUCCESSFUL!\n');
    console.log('Email service is properly configured.');
    console.log('You can now use the forgot password feature.\n');
    process.exit(0);
  }
});




















