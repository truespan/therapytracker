# Therapy Tracker - Render.com Quick Start

The fastest way to deploy Therapy Tracker to Render.com.

## 🚀 5-Minute Deployment

### Prerequisites
- Render.com account
- GitHub/GitLab repository with your code
- Gmail account (for emails)

### Step 1: Fork & Connect (2 min)
1. Go to [render.com](https://render.com)
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will detect `render.yaml`

### Step 2: Configure Secrets (1 min)
Before deploying, add these secrets:

1. **JWT_SECRET**: Generate one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **EMAIL_USER**: Your Gmail address

3. **EMAIL_PASSWORD**: Gmail App Password
   - Go to Google Account → Security
   - Enable 2FA
   - Create App Password for "Mail"

### Step 3: Deploy (1 min)
1. Click "Apply" in Render dashboard
2. Wait for services to deploy (~3-5 minutes)
3. Note your URLs:
   - Frontend: `https://therapy-tracker.onrender.com`
   - Backend: `https://therapy-tracker-api.onrender.com`

### Step 4: Setup Database (3 min)

#### Option A: Automated Script
```bash
# Install dependencies
cd backend && npm install

# Run migrations
DATABASE_URL="your_external_db_url" node database/scripts/run_migrations.js

# Create admin
DATABASE_URL="your_external_db_url" node database/scripts/create_admin.js
```

#### Option B: Manual SQL
```bash
# Connect to database
psql "your_external_database_url"

# Run migrations
\i backend/database/schema.sql
\i backend/database/migrations/add_admin_support.sql
\i backend/database/migrations/update_subscription_plans.sql
# ... (see RENDER_DEPLOYMENT_GUIDE.md for full list)

# Create admin (generate hash first)
INSERT INTO admins (name, email) VALUES ('Admin', 'admin@yourcompany.com');
```

### Step 5: Login (1 min)
1. Go to your frontend URL
2. Login with:
   - Email: `admin@therapytracker.com`
   - Password: `Admin@123`
3. **Change password immediately!**

---

## ✅ Post-Deployment

### Update FRONTEND_URL
1. Go to backend service in Render
2. Update `FRONTEND_URL` environment variable
3. Trigger manual deploy

### Test Everything
- [ ] Admin login works
- [ ] Create organization
- [ ] Create partner
- [ ] Create user
- [ ] Test email sending

---

## 🆘 Troubleshooting

### Backend won't start
- Check environment variables are set
- Verify DATABASE_URL is correct (use Internal URL)
- Check logs in Render dashboard

### Frontend shows blank page
- Verify REACT_APP_API_URL is correct
- Check browser console for errors
- Ensure backend is running

### Database connection fails
- Use Internal Database URL for backend
- Ensure database and backend in same region
- Check database is fully provisioned

### Emails not sending
- Use Gmail App Password (not regular password)
- Enable 2FA on Gmail account
- Check EMAIL_HOST and EMAIL_PORT

---

## 📚 Full Documentation

For detailed instructions, see:
- **[RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)** - Complete guide
- **[RENDER_DEPLOYMENT_CHECKLIST.md](./RENDER_DEPLOYMENT_CHECKLIST.md)** - Quick checklist
- **[render.yaml](./render.yaml)** - Infrastructure as Code

---

## 💰 Costs

### Free Tier (Testing)
- Database: Free for 90 days
- Backend: Free (sleeps after 15 min)
- Frontend: Free
- **Total: $0/month**

### Production (Recommended)
- Database Starter: $7/month
- Backend Starter: $7/month
- Frontend: Free
- **Total: $14/month**

---

## 🔒 Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (64+ chars)
- [ ] Use Gmail App Password
- [ ] Use Internal Database URL
- [ ] Enable HTTPS (automatic)
- [ ] Rotate secrets quarterly

---

## 🎯 What's Deployed?

```
therapy-tracker/
├── PostgreSQL Database
│   └── therapy_tracker
├── Backend API
│   └── Node.js + Express
│   └── https://therapy-tracker-api.onrender.com
└── Frontend
    └── React SPA
    └── https://therapy-tracker.onrender.com
```

---

## 📧 Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Render Support: https://render.com/support

---

**Ready to deploy? Let's go! 🚀**

Total time: ~12 minutes
