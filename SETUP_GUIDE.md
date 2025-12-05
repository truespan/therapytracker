# Therapy Tracker - Complete Setup Guide

This guide will walk you through setting up the Therapy Tracker application from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v16 or higher - [Download](https://nodejs.org/)
- **PostgreSQL** v13 or higher - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional) - [Download](https://git-scm.com/)

## Step-by-Step Setup

### 1. Initial Setup

Clone or navigate to the project directory:

```bash
cd therapy-tracker
```

### 2. Database Setup

#### A. Create Database

Open your PostgreSQL terminal:

```bash
# On macOS/Linux
psql -U postgres

# On Windows, open pgAdmin or psql from Start Menu
```

Create the database:

```sql
CREATE DATABASE therapy_tracker;
\q
```

#### B. Load Schema

Load the database schema:

```bash
psql -U postgres -d therapy_tracker -f backend/database/schema.sql
```

You should see output confirming table creation.

#### C. Load Sample Data (Optional)

If you want to test with sample data:

```bash
psql -U postgres -d therapy_tracker -f backend/database/seed.sql
```

This creates:
- 1 organization: Wellness Center
- 2 therapists: Dr. Sarah Johnson, Dr. Michael Chen
- 2 patients: John Doe, Jane Smith
- All with password: `password123`

### 3. Backend Setup

Navigate to backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
# On macOS/Linux
cp .env.example .env

# On Windows
copy .env.example .env
```

Edit `.env` file with your settings:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/therapy_tracker
JWT_SECRET=your_very_secret_jwt_key_change_this_in_production
NODE_ENV=development
```

**Important:** Replace `YOUR_PASSWORD` with your PostgreSQL password.

Start the backend server:

```bash
npm start
```

You should see:

```
Server is running on port 5000
Environment: development
Connected to PostgreSQL database
```

**Leave this terminal running** and open a new terminal for the frontend.

### 4. Frontend Setup

Open a new terminal and navigate to frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
# On macOS/Linux
cp .env.example .env

# On Windows
copy .env.example .env
```

The default `.env` should work:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm start
```

Your browser should automatically open to `http://localhost:3000`

### 5. Verify Installation

#### A. Check Backend

Open `http://localhost:5000` in your browser. You should see:

```json
{
  "message": "TheraP Track API",
  "version": "1.0.0",
  ...
}
```

#### B. Check Frontend

The frontend should load at `http://localhost:3000` showing the home page.

### 6. Test the Application

#### Option 1: Use Sample Data

If you loaded the seed data, try logging in:

**As a Patient:**
- Email: `john.doe@email.com`
- Password: `password123`

**As a Therapist:**
- Email: `sarah.johnson@wellnesscenter.com`
- Password: `password123`

**As an Organization:**
- Email: `contact@wellnesscenter.com`
- Password: `password123`

#### Option 2: Create New Account

1. Click "Sign up" on the home page
2. Select your role (User/Therapist/Organization)
3. Fill in the form
4. Click "Create Account"

### 7. Using the Application

#### For Patients (Users):

1. After signing up, you'll be taken to your dashboard
2. Wait to be assigned to a therapist (or use sample data)
3. Click "Start New Session" to begin your first assessment
4. Complete the mind-body questionnaire
5. View your progress on the radar chart

#### For Therapists (Partners):

1. Sign up and select an organization
2. View your assigned clients in the left panel
3. Click on a client to see their progress
4. Click "New Session" to create a session for a client
5. The client can then complete their assessment

#### For Organizations:

1. Sign up as an organization
2. View all therapists in your organization
3. Click on a therapist to see their clients
4. Click on a client to see detailed progress

## Troubleshooting

### Common Issues

#### Backend won't start

**Error:** "ECONNREFUSED" or "database connection failed"

**Solution:**
1. Verify PostgreSQL is running:
   ```bash
   # On macOS/Linux
   sudo service postgresql status
   
   # On Windows, check Services
   ```
2. Check your DATABASE_URL in backend/.env
3. Verify the database exists:
   ```bash
   psql -U postgres -l
   ```

#### Frontend can't connect to backend

**Error:** "Network Error" or API calls failing

**Solution:**
1. Verify backend is running on port 5000
2. Check REACT_APP_API_URL in frontend/.env
3. Look for CORS errors in browser console

#### Port already in use

**Error:** "Port 5000 is already in use"

**Solution:**
1. Change PORT in backend/.env to another port (e.g., 5001)
2. Update REACT_APP_API_URL in frontend/.env accordingly
3. Restart both servers

#### Database schema errors

**Error:** "relation does not exist"

**Solution:**
1. Drop and recreate the database:
   ```sql
   DROP DATABASE IF EXISTS therapy_tracker;
   CREATE DATABASE therapy_tracker;
   ```
2. Reload the schema:
   ```bash
   psql -U postgres -d therapy_tracker -f backend/database/schema.sql
   ```

### Verification Commands

Check if services are running:

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check if backend is responding
curl http://localhost:5000/api/health

# Check Node.js version
node --version

# Check npm version
npm --version
```

## Production Deployment

### Backend Production Setup

1. Set environment to production:
   ```env
   NODE_ENV=production
   ```

2. Use a strong JWT secret:
   ```bash
   # Generate a random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Use environment-specific database:
   ```env
   DATABASE_URL=postgresql://user:pass@production-host:5432/therapy_tracker
   ```

### Frontend Production Build

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. The `build/` folder contains the production-ready files

3. Serve with a static file server or deploy to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Your own server with nginx

### Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Enable rate limiting
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the main README.md
3. Check the browser console for frontend errors
4. Check backend logs for API errors
5. Verify all environment variables are set correctly

## Next Steps

Now that your application is running:

1. Create some test users and sessions
2. Explore the different dashboards
3. Try creating custom profile fields
4. Test the radar chart visualizations
5. Review the API documentation in README.md

Happy tracking! 🎉

