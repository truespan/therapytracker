# 🔐 Admin Panel - Therapy Tracker

> Complete admin system for managing organizations, tracking metrics, and controlling platform access.

## 🚀 Quick Start (5 Minutes)

### 1️⃣ Run Database Migration
```bash
psql -U postgres -d therapy_tracker -f backend/database/migrations/add_admin_support.sql
```

### 2️⃣ Setup Admin Account
```bash
cd backend
node database/scripts/setup_admin.js
```

### 3️⃣ Login as Admin
- Navigate to: `http://localhost:3000/login`
- Email: `admin@therapytracker.com`
- Password: `Admin@123`

🎉 **You're ready to go!**

---

## 📚 Documentation

Choose the guide that fits your needs:

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Quick Start Guide](ADMIN_PANEL_QUICK_START.md)** | Get up and running fast | First-time setup, quick reference |
| **[Setup Guide](ADMIN_PANEL_SETUP_GUIDE.md)** | Comprehensive documentation | Detailed setup, troubleshooting |
| **[Testing Checklist](ADMIN_PANEL_TESTING_CHECKLIST.md)** | Verify everything works | QA, pre-deployment testing |
| **[Implementation Summary](ADMIN_PANEL_IMPLEMENTATION_SUMMARY.md)** | Technical overview | Developers, code review |

---

## ✨ Key Features

### 🏢 Organization Management
- ✅ Create, edit, delete organizations
- ✅ Activate/deactivate accounts
- ✅ Manage subscription plans (Basic, Silver, Gold)
- ✅ Track GST numbers

### 📊 Metrics Dashboard
- ✅ System-wide statistics
- ✅ Organization-specific analytics
- ✅ Partner performance tracking
- ✅ Session monitoring

### 🔒 Security
- ✅ Role-based access control
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Audit trail

### 🎨 User Interface
- ✅ Modern, responsive design
- ✅ Instant search & filters
- ✅ Interactive modals
- ✅ Real-time updates

---

## 📸 Screenshots

### Admin Dashboard
```
┌─────────────────────────────────────────────────┐
│  🛡️  Admin Panel - Therapy Tracker            │
│  Super Admin (Admin) [Logout]                   │
├─────────────────────────────────────────────────┤
│  [Dashboard] [Organizations]                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  Admin Dashboard                                 │
│  Manage organizations and view system stats     │
│                                 [+ Create Org]   │
│                                                  │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│  │  25   │ │  150  │ │  500  │ │ 2,450 │       │
│  │ Orgs  │ │Partner│ │Client │ │Session│       │
│  └───────┘ └───────┘ └───────┘ └───────┘       │
│                                                  │
│  Search: [______________]  [All][Active][...]   │
│                                                  │
│  Organization | Contact | Plan | Actions        │
│  ──────────────────────────────────────────     │
│  ABC Therapy  | ... | Gold | 📊 ✏️ ⚠️ 🗑️      │
│  XYZ Clinic   | ... | Silver | 📊 ✏️ ⚠️ 🗑️    │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Common Tasks

### Create Organization
```
1. Click "+ Create Organization"
2. Fill in details (name, email, contact, address)
3. Set password for organization
4. Optional: Add GST number and subscription plan
5. Click "Create Organization"
```

### View Metrics
```
1. Click 📊 icon on any organization
2. View:
   - Partner count
   - Client count
   - Session statistics
   - Partner breakdown
```

### Deactivate Organization
```
1. Click ⚠️ icon on active organization
2. Confirm action
3. Organization cannot login (data preserved)
4. Can reactivate later with ✓ icon
```

### Delete Organization
```
1. Click 🗑️ icon
2. Review counts (partners, clients, sessions)
3. Type organization name to confirm
4. Permanent deletion (cannot be undone!)
```

---

## 🔧 API Endpoints

All require: `Authorization: Bearer <token>` + Admin role

```bash
# Get all organizations
GET /api/admin/organizations

# Create organization
POST /api/admin/organizations
Body: { name, email, contact, address, password, gst_no?, subscription_plan? }

# Update organization
PUT /api/admin/organizations/:id
Body: { name?, email?, contact?, address?, gst_no?, subscription_plan? }

# Deactivate/Activate
POST /api/admin/organizations/:id/deactivate
POST /api/admin/organizations/:id/activate

# Delete permanently
DELETE /api/admin/organizations/:id

# Get metrics
GET /api/admin/organizations/:id/metrics

# Get dashboard stats
GET /api/admin/dashboard/stats
```

---

## 🏗️ Architecture

### Database
```
admins
  ├── id (PK)
  ├── name
  ├── email (unique)
  └── created_at

organizations (updated)
  ├── ... (existing fields)
  ├── gst_no
  ├── subscription_plan
  ├── is_active
  ├── deactivated_at
  └── deactivated_by (FK → admins)

auth_credentials (updated)
  └── user_type: 'user' | 'partner' | 'organization' | 'admin'
```

### Backend Structure
```
backend/
├── database/
│   ├── migrations/
│   │   └── add_admin_support.sql
│   └── scripts/
│       └── setup_admin.js
├── src/
│   ├── models/
│   │   ├── Admin.js (new)
│   │   └── Organization.js (updated)
│   ├── controllers/
│   │   ├── adminController.js (new)
│   │   └── authController.js (updated)
│   └── routes/
│       └── index.js (updated)
```

### Frontend Structure
```
frontend/
└── src/
    ├── components/
    │   ├── admin/
    │   │   ├── CreateOrganizationModal.jsx (new)
    │   │   ├── EditOrganizationModal.jsx (new)
    │   │   └── OrganizationMetricsModal.jsx (new)
    │   ├── dashboard/
    │   │   └── AdminDashboard.jsx (new)
    │   └── layout/
    │       └── AdminLayout.jsx (new)
    ├── pages/
    │   └── Login.jsx (updated)
    ├── services/
    │   └── api.js (updated)
    └── App.jsx (updated)
```

---

## 🔒 Security Best Practices

### ✅ DO
- ✅ Change default admin password immediately
- ✅ Use strong passwords (min 8 chars, mixed case, numbers, symbols)
- ✅ Log out when done
- ✅ Regularly review organization list
- ✅ Use deactivate instead of delete when possible

### ❌ DON'T
- ❌ Share admin credentials
- ❌ Use default password in production
- ❌ Delete organizations without confirming
- ❌ Leave admin session open on shared computers
- ❌ Store passwords in plain text

---

## 🐛 Troubleshooting

### Issue: Cannot Login
```bash
# Check admin exists
psql -d therapy_tracker -c "SELECT * FROM admins WHERE email = 'admin@therapytracker.com';"

# Re-run setup
cd backend
node database/scripts/setup_admin.js
```

### Issue: 403 Forbidden
```
Cause: Not logged in as admin
Solution: 
  1. Logout
  2. Login with admin credentials
  3. Verify userType is 'admin' in localStorage
```

### Issue: Organizations Not Loading
```
Cause: Database connection or permissions
Solution:
  1. Check backend is running
  2. Check database connection
  3. Verify JWT token is valid
  4. Check browser console for errors
```

### Issue: Metrics Show Zero
```
Cause: No data or broken relationships
Solution:
  1. Verify organization has partners
  2. Check partners have assigned users
  3. Verify sessions exist
  4. Run SQL query to check data
```

---

## 📊 Subscription Plans

| Plan | Clients/Month | Pricing | Features |
|------|---------------|---------|----------|
| **Basic** | Up to 10 | Pay per session | Core features |
| **Silver** | 10-50 | Fixed monthly | + Priority support |
| **Gold** | 50+ | Premium | + Advanced analytics |

---

## 🧪 Testing

### Quick Test
```bash
# 1. Test admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapytracker.com","password":"Admin@123"}'

# 2. Get organizations (replace TOKEN)
curl -X GET http://localhost:5000/api/admin/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Full Testing
See [Testing Checklist](ADMIN_PANEL_TESTING_CHECKLIST.md) for comprehensive test cases.

---

## 📦 Files Summary

### Created (16 files)
- 4 Database files (migrations, scripts)
- 2 Backend models
- 1 Backend controller
- 5 Frontend components
- 4 Documentation files

### Modified (7 files)
- 3 Backend files (model, controller, routes)
- 3 Frontend files (api, login, router)
- 1 Auth context (no changes needed)

---

## 🚢 Deployment Checklist

- [ ] Run database migration
- [ ] Setup admin account
- [ ] Change default password
- [ ] Test all features
- [ ] Review security settings
- [ ] Configure environment variables
- [ ] Enable HTTPS (production)
- [ ] Setup database backups
- [ ] Configure monitoring
- [ ] Document admin credentials (secure location)

---

## 📞 Support

### Need Help?
1. **Check Documentation** → Start with [Quick Start](ADMIN_PANEL_QUICK_START.md)
2. **Search Issues** → Look for similar problems in docs
3. **Check Logs** → Backend logs show `[ADMIN]` prefix
4. **Test API** → Use curl to verify endpoints
5. **Contact Team** → Reach out to developers

### Resources
- 📖 [Quick Start Guide](ADMIN_PANEL_QUICK_START.md)
- 📖 [Setup Guide](ADMIN_PANEL_SETUP_GUIDE.md)
- 📖 [Testing Checklist](ADMIN_PANEL_TESTING_CHECKLIST.md)
- 📖 [Implementation Summary](ADMIN_PANEL_IMPLEMENTATION_SUMMARY.md)

---

## 📝 License

Part of Therapy Tracker application. All rights reserved.

---

## 🎉 You're All Set!

The admin panel is ready to use. Start by logging in and exploring the features.

**Default Credentials:**
```
Email:    admin@therapytracker.com
Password: Admin@123
```

**Remember:** Change your password after first login! 🔐

---

**Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** ✅ Complete & Ready for Use

