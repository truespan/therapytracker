# Therapy Tracker - Render.com Deployment Checklist

Quick reference checklist for deploying to Render.com.

## Pre-Deployment (15 minutes)

### Repository
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] `.env` files in `.gitignore`
- [ ] All features tested locally
- [ ] No sensitive data in code

### Credentials Ready
- [ ] JWT Secret generated (64+ chars)
- [ ] Gmail App Password created
- [ ] SMTP settings documented
- [ ] Render.com account created

---

## Phase 1: Database (10 minutes)

- [ ] Create PostgreSQL database on Render
  - Name: `therapy-tracker-db`
  - Region: Oregon (or closest)
  - Plan: Free/Starter
- [ ] Note Internal Database URL
- [ ] Note External Database URL

---

## Phase 2: Backend (15 minutes)

- [ ] Create Web Service
  - Root directory: `backend`
  - Build: `npm install`
  - Start: `npm start`
- [ ] Add environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5000`
  - [ ] `DATABASE_URL` (Internal URL)
  - [ ] `JWT_SECRET` (generated)
  - [ ] `EMAIL_HOST=smtp.gmail.com`
  - [ ] `EMAIL_PORT=587`
  - [ ] `EMAIL_USER` (your email)
  - [ ] `EMAIL_PASSWORD` (App Password)
  - [ ] `EMAIL_FROM`
  - [ ] `FRONTEND_URL` (temp)
- [ ] Deploy and note URL

---

## Phase 3: Database Setup (10 minutes)

Connect using External URL:
```bash
psql "<EXTERNAL_DATABASE_URL>"
```

Run migrations in order:
- [ ] `\i backend/database/schema.sql`
- [ ] `\i backend/database/migration_password_reset.sql`
- [ ] `\i backend/database/migrations/add_admin_support.sql`
- [ ] `\i backend/database/migrations/add_video_sessions.sql`
- [ ] `\i backend/database/migrations/add_video_sessions_toggle.sql`
- [ ] `\i backend/database/migrations/add_custom_questionnaires_postgres.sql`
- [ ] `\i backend/database/migrations/add_question_subheadings.sql`
- [ ] `\i backend/database/migrations/add_questionnaire_text_field.sql`
- [ ] `\i backend/database/migrations/update_subscription_plans.sql`

---

## Phase 4: Admin Setup (5 minutes)

Generate password hash:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin@123', 10, (err, hash) => console.log(hash));"
```

Create admin account (replace `HASH` with actual hash):
```sql
INSERT INTO admins (name, email) VALUES ('Super Admin', 'admin@yourcompany.com');
INSERT INTO auth_credentials (user_type, reference_id, email, password_hash)
SELECT 'admin', a.id, 'admin@yourcompany.com', 'HASH'
FROM admins a WHERE a.email = 'admin@yourcompany.com';
```

---

## Phase 5: Frontend (10 minutes)

- [ ] Create Static Site
  - Root directory: `frontend`
  - Build: `npm install && npm run build`
  - Publish: `build`
- [ ] Add environment variable:
  - [ ] `REACT_APP_API_URL=https://your-backend.onrender.com/api`
- [ ] Deploy and note URL

---

## Phase 6: Final Configuration (5 minutes)

- [ ] Update backend `FRONTEND_URL` with actual frontend URL
- [ ] Redeploy backend
- [ ] Test CORS (no console errors)

---

## Testing (10 minutes)

### Basic Tests
- [ ] Frontend loads
- [ ] No console errors
- [ ] API calls work

### Authentication
- [ ] Admin login works
- [ ] Token stored correctly
- [ ] Logout works

### Features
- [ ] Admin dashboard
- [ ] Create organization
- [ ] Create partner
- [ ] Create user
- [ ] Email sending

---

## Security

- [ ] Default admin password changed
- [ ] JWT_SECRET is strong
- [ ] Using Internal Database URL
- [ ] HTTPS enabled (automatic)
- [ ] Email App Password (not main)

---

## Optional

- [ ] Custom domain configured
- [ ] Auto-deploy enabled
- [ ] Monitoring alerts set up
- [ ] Backup strategy configured

---

## Admin Login

**Email**: admin@yourcompany.com
**Password**: Admin@123 (change immediately!)

---

## URLs

**Frontend**: ___________________________
**Backend**: ___________________________
**Database**: ___________________________

---

**Total Time**: ~60 minutes
**Deployed By**: ___________________________
**Date**: ___________________________
**Status**: [ ] Complete [ ] Issues
