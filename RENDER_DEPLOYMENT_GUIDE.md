# Therapy Tracker - Render.com Deployment Guide

Complete step-by-step guide to deploy the Therapy Tracker application on Render.com.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Deployment Architecture](#deployment-architecture)
4. [Method 1: Manual Deployment (Recommended for First-Time)](#method-1-manual-deployment)
5. [Method 2: Blueprint Deployment (Infrastructure as Code)](#method-2-blueprint-deployment)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Database Migration](#database-migration)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Prerequisites

Before starting the deployment, ensure you have:

- [x] A Render.com account (sign up at https://render.com)
- [x] Your code repository on GitHub, GitLab, or Bitbucket
- [x] Admin email credentials for the email service (Gmail or other SMTP)
- [x] Basic understanding of environment variables
- [x] A custom domain (optional, but recommended for production)

---

## Project Overview

The Therapy Tracker is a full-stack application with:

- **Backend**: Node.js + Express API
- **Frontend**: React SPA (Single Page Application) with Tailwind CSS
- **Database**: PostgreSQL
- **Email Service**: Nodemailer (SMTP)

### Technology Stack
- Node.js 18+
- React 18+
- PostgreSQL 14+
- Express.js
- JWT Authentication
- bcrypt for password hashing
- Nodemailer for email notifications

---

## Deployment Architecture

On Render.com, you'll deploy:

1. **PostgreSQL Database** - Managed database instance
2. **Backend API** - Node.js web service
3. **Frontend** - Static site (React build)

```
┌─────────────────┐
│  Static Site    │ ◄── React Frontend (Port 443/HTTPS)
│  (Frontend)     │
└────────┬────────┘
         │
         │ API Calls
         ▼
┌─────────────────┐
│  Web Service    │ ◄── Express Backend (Internal/HTTPS)
│  (Backend API)  │
└────────┬────────┘
         │
         │ SQL Queries
         ▼
┌─────────────────┐
│  PostgreSQL     │ ◄── Database (Internal)
│  Database       │
└─────────────────┘
```

---

## Method 1: Manual Deployment

This method is recommended for first-time deployment to understand each component.

### Step 1: Create PostgreSQL Database

1. **Login to Render Dashboard**
   - Go to https://dashboard.render.com
   - Click on "New +" button
   - Select "PostgreSQL"

2. **Configure Database**
   ```
   Name: therapy-tracker-db
   Database: therapy_tracker
   User: (auto-generated)
   Region: Oregon (or closest to your users)
   PostgreSQL Version: 15
   Plan: Free (or Starter for production)
   ```

3. **Create Database**
   - Click "Create Database"
   - Wait for database to be provisioned (1-2 minutes)

4. **Save Database Connection Details**
   - On the database info page, note down:
     - **Internal Database URL** (starts with `postgresql://`)
     - **External Database URL** (for local migrations)
     - **Hostname**
     - **Port**
     - **Database name**
     - **Username**
     - **Password**

### Step 2: Deploy Backend API

1. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Grant Render access to your repository

2. **Configure Backend Service**
   ```
   Name: therapy-tracker-api
   Region: Oregon (same as database)
   Branch: master (or main)
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free (or Starter for production)
   ```

3. **Add Environment Variables**
   Click on "Environment" tab and add the following variables:

   ```bash
   # Server Configuration
   NODE_ENV=production
   PORT=5000

   # Database - Use Internal Database URL from Step 1
   DATABASE_URL=<YOUR_INTERNAL_DATABASE_URL>

   # JWT Secret - Generate a secure random string
   JWT_SECRET=<GENERATE_STRONG_SECRET_HERE>

   # Email Configuration (Gmail example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=<YOUR_GMAIL_ADDRESS>
   EMAIL_PASSWORD=<YOUR_GMAIL_APP_PASSWORD>
   EMAIL_FROM=Therapy Tracker <noreply@therapytracker.com>

   # Frontend URL - Will be updated after frontend deployment
   FRONTEND_URL=https://therapy-tracker.onrender.com
   ```

   **Important Notes:**
   - `DATABASE_URL`: Copy the "Internal Database URL" from your PostgreSQL database
   - `JWT_SECRET`: Generate using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `EMAIL_PASSWORD`: Use Gmail App Password (not your regular password)
   - `FRONTEND_URL`: Use your frontend URL (update later if needed)

4. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)
   - Check logs for any errors
   - Once deployed, note the backend URL (e.g., `https://therapy-tracker-api.onrender.com`)

5. **Verify Backend Deployment**
   - Visit `https://therapy-tracker-api.onrender.com/`
   - You should see the API welcome message with version and endpoints

### Step 3: Run Database Migrations

You need to set up the database schema. You can do this in two ways:

#### Option A: Using External Database URL (Recommended)

From your local machine:

```bash
# Connect to Render PostgreSQL database
psql "<YOUR_EXTERNAL_DATABASE_URL>"

# Run the main schema
\i backend/database/schema.sql

# Run migrations in order
\i backend/database/migration_password_reset.sql
\i backend/database/migrations/add_admin_support.sql
\i backend/database/migrations/add_video_sessions.sql
\i backend/database/migrations/add_video_sessions_toggle.sql
\i backend/database/migrations/add_custom_questionnaires_postgres.sql
\i backend/database/migrations/add_question_subheadings.sql
\i backend/database/migrations/add_questionnaire_text_field.sql
\i backend/database/migrations/update_subscription_plans.sql

# Optional: Add seed data for testing
\i backend/database/seed.sql

# Quit psql
\q
```

#### Option B: Using Render Shell (Advanced)

1. Go to your database in Render dashboard
2. Click "Connect" → "External Connection"
3. Use the provided connection details with a PostgreSQL client
4. Run the SQL files manually

### Step 4: Create Admin Account

After running migrations, create your admin account:

```bash
# Connect to database
psql "<YOUR_EXTERNAL_DATABASE_URL>"

# Create admin account with password 'Admin@123' (change after first login)
INSERT INTO admins (name, email)
VALUES ('Super Admin', 'admin@yourcompany.com')
ON CONFLICT (email) DO NOTHING;

# Create auth credentials (password will be 'Admin@123')
INSERT INTO auth_credentials (user_type, reference_id, email, password_hash)
SELECT
    'admin',
    a.id,
    'admin@yourcompany.com',
    '$2b$10$YourBcryptHashHere'
FROM admins a
WHERE a.email = 'admin@yourcompany.com'
ON CONFLICT (email) DO NOTHING;
```

**Better Approach**: Use the setup script:

```bash
cd backend
npm install
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin@123', 10, (err, hash) => {
  if (err) console.error(err);
  else console.log('Password hash:', hash);
});
"
```

Copy the generated hash and use it in the INSERT statement above.

### Step 5: Deploy Frontend

1. **Create Static Site**
   - Click "New +" → "Static Site"
   - Connect the same repository
   - Grant access if prompted

2. **Configure Frontend Service**
   ```
   Name: therapy-tracker
   Branch: master (or main)
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

3. **Add Environment Variables**
   Click "Environment" and add:

   ```bash
   # API URL - Use your backend service URL from Step 2
   REACT_APP_API_URL=https://therapy-tracker-api.onrender.com/api
   ```

4. **Deploy Frontend**
   - Click "Create Static Site"
   - Wait for build and deployment (3-5 minutes)
   - Once deployed, note the frontend URL (e.g., `https://therapy-tracker.onrender.com`)

5. **Update Backend FRONTEND_URL**
   - Go back to your backend service
   - Update the `FRONTEND_URL` environment variable with your actual frontend URL
   - Trigger a manual deploy to apply the change

### Step 6: Configure CORS (If Needed)

The backend already has CORS enabled. Verify the CORS configuration in `backend/src/server.js` allows your frontend URL.

If you encounter CORS issues, update the backend CORS configuration:

```javascript
// backend/src/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

---

## Method 2: Blueprint Deployment

Use the included `render.yaml` file for Infrastructure as Code deployment.

### Step 1: Prepare render.yaml

The `render.yaml` file is already created in your project root. Review and update any necessary values.

### Step 2: Deploy from Dashboard

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will detect the `render.yaml` file
5. Review the services that will be created:
   - PostgreSQL Database
   - Backend Web Service
   - Frontend Static Site

### Step 3: Configure Environment Variables

Before deploying, you'll need to provide:
- `JWT_SECRET` (generate a secure random string)
- `EMAIL_USER` (your SMTP email)
- `EMAIL_PASSWORD` (your SMTP password)

### Step 4: Deploy

1. Click "Apply"
2. Wait for all services to be deployed
3. Follow Steps 3-4 from Method 1 for database migration and admin setup

---

## Post-Deployment Setup

### 1. Test the Application

Visit your frontend URL and test:

- [ ] Homepage loads correctly
- [ ] Login page is accessible
- [ ] Admin login works (`admin@yourcompany.com` / `Admin@123`)
- [ ] Organization creation works
- [ ] Partner creation works
- [ ] User creation works
- [ ] Video sessions feature works

### 2. Change Default Admin Password

1. Login as admin
2. Go to admin profile settings
3. Change password from `Admin@123` to a secure password

### 3. Configure Email Service

If using Gmail:
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password for "Mail"
4. Use this App Password as `EMAIL_PASSWORD`

### 4. Set Up Custom Domain (Optional)

#### For Frontend:
1. Go to your frontend static site settings
2. Click "Custom Domain"
3. Add your domain (e.g., `app.yourcompany.com`)
4. Follow DNS configuration instructions
5. Add CNAME record pointing to your Render URL

#### For Backend:
1. Go to your backend web service settings
2. Click "Custom Domain"
3. Add your API subdomain (e.g., `api.yourcompany.com`)
4. Update frontend's `REACT_APP_API_URL` environment variable
5. Redeploy frontend

### 5. Enable Auto-Deploy

1. Go to each service settings
2. Under "Settings" → "Build & Deploy"
3. Enable "Auto-Deploy" for automatic deployments on git push

### 6. Set Up SSL/HTTPS

Render automatically provides SSL certificates for:
- All `.onrender.com` domains
- Custom domains (via Let's Encrypt)

No additional configuration needed!

---

## Database Migration

### Running New Migrations

When you add new features and need to run migrations:

1. **Add Migration File** to `backend/database/migrations/`

2. **Connect to Production Database**:
   ```bash
   psql "<YOUR_EXTERNAL_DATABASE_URL>"
   ```

3. **Run Migration**:
   ```sql
   \i backend/database/migrations/your_new_migration.sql
   ```

4. **Verify Migration**:
   ```sql
   -- Check tables
   \dt

   -- Check specific table structure
   \d table_name
   ```

### Backup Database

Before running major migrations:

1. Go to database dashboard in Render
2. Click "Backups" (available on paid plans)
3. Create manual backup

Or use `pg_dump`:
```bash
pg_dump "<YOUR_EXTERNAL_DATABASE_URL>" > backup.sql
```

---

## Troubleshooting

### Backend Issues

#### Issue: Backend build fails
**Solution**: Check build logs for missing dependencies
```bash
# Ensure all dependencies are in package.json
npm install --save <missing-package>
```

#### Issue: Database connection fails
**Solution**:
- Verify `DATABASE_URL` is the Internal Database URL
- Check database is in same region as backend
- Ensure database is fully provisioned

#### Issue: Email sending fails
**Solution**:
- Verify SMTP credentials
- For Gmail: Use App Password, not regular password
- Check `EMAIL_HOST` and `EMAIL_PORT` are correct

### Frontend Issues

#### Issue: Frontend build fails
**Solution**: Check Node version compatibility
```bash
# In render.yaml or service settings, specify Node version
NODE_VERSION=18
```

#### Issue: API calls fail with CORS error
**Solution**:
- Verify `REACT_APP_API_URL` is correct
- Ensure backend CORS allows frontend URL
- Check backend `FRONTEND_URL` environment variable

#### Issue: Blank page after deployment
**Solution**:
- Check browser console for errors
- Verify `REACT_APP_API_URL` is set correctly
- Ensure backend is running and accessible

### Database Issues

#### Issue: Migrations fail
**Solution**:
- Check migration file syntax
- Ensure migrations run in correct order
- Verify database schema version

#### Issue: Connection limit reached
**Solution**:
- Upgrade database plan for more connections
- Implement connection pooling
- Check for connection leaks in code

---

## Monitoring and Maintenance

### 1. Monitor Service Health

- **Render Dashboard**: Check service status and metrics
- **Logs**: View real-time logs for each service
- **Metrics**: Monitor CPU, memory, and request rates

### 2. Set Up Alerts

1. Go to service settings
2. Under "Notifications"
3. Add email or Slack webhook for:
   - Deploy success/failure
   - Service down
   - High error rates

### 3. Monitor Database

- Check connection count
- Monitor query performance
- Set up automatic backups (paid plans)

### 4. Regular Maintenance

- [ ] Review logs weekly for errors
- [ ] Monitor database size and performance
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Review and rotate secrets quarterly
- [ ] Test backup restoration periodically

### 5. Scaling Considerations

**When to upgrade:**
- Free tier sleeps after 15 minutes of inactivity
- Response times consistently > 2 seconds
- Database connections maxed out
- Memory/CPU consistently > 80%

**Upgrade path:**
- Free → Starter ($7/month per service)
- Starter → Standard ($25/month per service)
- Database: Free → Starter → Standard → Pro

---

## Cost Estimation

### Free Tier (Development/Testing)
- PostgreSQL: 1 GB storage, expires after 90 days
- Web Service: Free tier (sleeps after 15 min inactivity)
- Static Site: Free with 100 GB bandwidth
- **Total**: $0/month (with limitations)

### Production Setup (Recommended)
- PostgreSQL Starter: $7/month (10 GB storage)
- Backend Web Service Starter: $7/month
- Frontend Static Site: Free (or $1/month for custom domain)
- **Total**: ~$14-15/month

### Enterprise Setup
- PostgreSQL Standard: $25/month (50 GB storage)
- Backend Web Service Standard: $25/month
- Frontend Static Site: $1/month
- **Total**: ~$51/month

---

## Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **JWT Secret**: Use a strong, random 64+ character secret
3. **Database**: Use internal URL for backend connection
4. **HTTPS**: Always enabled by default on Render
5. **Passwords**: Change default admin password immediately
6. **Email**: Use app-specific passwords for Gmail
7. **Updates**: Keep dependencies updated regularly

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [React on Render](https://render.com/docs/deploy-create-react-app)
- [Environment Variables](https://render.com/docs/environment-variables)

---

## Support

If you encounter issues:

1. Check Render service logs for detailed error messages
2. Review this guide's troubleshooting section
3. Check Render's status page: https://status.render.com
4. Contact Render support: https://render.com/support

---

## Quick Deployment Checklist

- [ ] Create Render account
- [ ] Push code to GitHub/GitLab/Bitbucket
- [ ] Create PostgreSQL database on Render
- [ ] Deploy backend web service with environment variables
- [ ] Run database migrations
- [ ] Create admin account
- [ ] Deploy frontend static site
- [ ] Update backend FRONTEND_URL
- [ ] Test login and basic functionality
- [ ] Change default admin password
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and alerts
- [ ] Enable auto-deploy

---

**Deployment Time**: 30-45 minutes for first-time deployment

**Last Updated**: 2025-01-28
