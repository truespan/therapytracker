# Quick Setup Instructions

## Step 1: Apply Database Migration

Run the password reset tokens migration:

```bash
cd backend
psql -U your_username -d therapy_tracker -f database/migration_password_reset.sql
```

Or using Node.js:

```bash
cd backend
node -e "const db = require('./src/config/database'); const fs = require('fs'); const migration = fs.readFileSync('./database/migration_password_reset.sql', 'utf8'); db.query(migration).then(() => { console.log('Migration completed'); process.exit(0); }).catch(err => { console.error('Migration failed:', err); process.exit(1); });"
```

## Step 2: Install Nodemailer

```bash
cd backend
npm install nodemailer
```

## Step 3: Configure Email Service

Add these variables to your `backend/.env` file:

```env
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Therapy Tracker <noreply@therapytracker.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### For Gmail Setup:

1. Go to Google Account Settings
2. Enable 2-Factor Authentication
3. Go to Security > App Passwords
4. Generate new app password for "Mail"
5. Copy the 16-character password
6. Use it as `EMAIL_PASSWORD` in .env

### For Other Email Providers:

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your_mailgun_username
EMAIL_PASSWORD=your_mailgun_password
```

**AWS SES:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your_ses_smtp_username
EMAIL_PASSWORD=your_ses_smtp_password
```

## Step 4: Restart Backend Server

```bash
cd backend
npm start
```

Or for development:

```bash
npm run dev
```

## Step 5: Test the Features

### Test Mobile Login:
1. Go to http://localhost:3000/login
2. Enter phone number: `+919876543210`
3. Enter password
4. Click "Sign In"

### Test Forgot Password:
1. Go to http://localhost:3000/login
2. Click "Forgot Password?"
3. Enter email or phone number
4. Check your email for reset link
5. Click link and reset password

### Test Compact Country Code:
1. Go to http://localhost:3000/signup
2. Check the country code dropdown
3. Should be compact and easy to use

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] Nodemailer installed
- [ ] Email configuration added to .env
- [ ] Backend server restarted
- [ ] Can login with email
- [ ] Can login with phone number
- [ ] Forgot password sends email
- [ ] Reset password link works
- [ ] Country code field is compact

## Common Issues

### "Email service not configured"
- Check EMAIL_HOST and EMAIL_USER are set in .env
- Restart backend server after adding variables

### "Failed to send email"
- Check email credentials are correct
- For Gmail, use App Password not regular password
- Check firewall isn't blocking SMTP port 587

### "Invalid or expired token"
- Tokens expire after 1 hour
- Request a new password reset

### "Phone login not working"
- Ensure phone is stored with country code (+919876543210)
- Check format matches exactly

## Production Deployment

For production, consider:

1. **Use professional email service:**
   - SendGrid (recommended)
   - Mailgun
   - AWS SES
   - Postmark

2. **Update FRONTEND_URL:**
   ```env
   FRONTEND_URL=https://your-domain.com
   ```

3. **Use HTTPS:**
   - Required for secure password reset
   - Use SSL certificates

4. **Set up email monitoring:**
   - Track delivery rates
   - Monitor bounce rates
   - Set up alerts

5. **Add rate limiting:**
   - Limit password reset requests
   - Prevent abuse

## Support

If you encounter issues:
1. Check backend console logs
2. Check email service logs
3. Verify database migration applied
4. Test email configuration separately
5. Check all environment variables are set

All features are now ready to use!




















































