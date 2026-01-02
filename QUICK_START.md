# Quick Start Guide

Get Therapy Tracker running in 5 minutes!

## Prerequisites

- Node.js v16+
- PostgreSQL v13+

## Setup Commands

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE therapy_tracker;"

# 2. Load schema
psql -U postgres -d therapy_tracker -f backend/database/schema.sql

# 3. (Optional) Load sample data
psql -U postgres -d therapy_tracker -f backend/database/seed.sql

# 4. Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start

# 5. Setup frontend (in new terminal)
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm start
```

## Default Ports

- Backend API: http://localhost:5000
- Frontend: http://localhost:3000

## Sample Logins (if you loaded seed data)

**Patient:**
- Email: `john.doe@email.com`
- Password: `password123`

**Therapist:**
- Email: `sarah.johnson@wellnesscenter.com`
- Password: `password123`

**Organization:**
- Email: `contact@wellnesscenter.com`
- Password: `password123`

## Key Files to Configure

### Backend `.env`
```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/therapy_tracker
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Note:** In development mode (`NODE_ENV=development`), subscription payment checks are automatically bypassed, allowing you to test the application without completing payment flows.

## Verify Setup

1. Visit http://localhost:5000 - Should show API info
2. Visit http://localhost:3000 - Should show home page
3. Try logging in with sample credentials

## Common Issues

**Database connection failed?**
- Check PostgreSQL is running
- Verify DATABASE_URL in backend/.env

**API not connecting?**
- Verify backend is running on port 5000
- Check REACT_APP_API_URL in frontend/.env

**Port already in use?**
- Change PORT in backend/.env
- Update REACT_APP_API_URL accordingly

## Next Steps

- Sign up for a new account
- Create a therapy session
- Complete the mind-body assessment
- View your progress on radar charts

For detailed documentation, see README.md or SETUP_GUIDE.md

