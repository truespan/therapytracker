# Admin Panel - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Database Migration
```bash
# Run the admin migration
psql -U postgres -d therapy_tracker -f backend/database/migrations/add_admin_support.sql
```

### Step 2: Setup Admin Password
```bash
# Generate secure password hash
cd backend
node database/scripts/setup_admin.js
```

### Step 3: Login
- URL: `http://localhost:3000/login`
- Email: `admin@therapytracker.com`
- Password: `Admin@123`

## 📋 Default Admin Credentials

```
Email:    admin@therapytracker.com
Password: Admin@123
```

⚠️ **Change the default password after first login!**

## 🎯 Key Features

| Feature | Description | Action |
|---------|-------------|--------|
| **Create Organization** | Add new organization to the system | Click "+ Create Organization" |
| **Edit Organization** | Update organization details | Click pencil icon |
| **View Metrics** | See detailed analytics | Click chart icon |
| **Deactivate** | Temporarily disable (soft delete) | Click warning icon |
| **Activate** | Re-enable deactivated organization | Click check icon |
| **Delete** | Permanently remove (hard delete) | Click trash icon |

## 🔍 Quick Actions

### Search Organizations
```
Type in the search box → Searches name and email
```

### Filter by Status
```
All        → Show all organizations
Active     → Show only active organizations
Inactive   → Show only deactivated organizations
```

### View Dashboard Stats
```
Navigate to: http://localhost:3000/admin
```

## 📁 Files Modified/Created

### Backend
```
✅ backend/database/migrations/add_admin_support.sql
✅ backend/database/scripts/setup_admin.js
✅ backend/src/models/Admin.js
✅ backend/src/controllers/adminController.js
✅ backend/src/models/Organization.js (updated)
✅ backend/src/controllers/authController.js (updated)
✅ backend/src/routes/index.js (updated)
```

### Frontend
```
✅ frontend/src/components/layout/AdminLayout.jsx
✅ frontend/src/components/dashboard/AdminDashboard.jsx
✅ frontend/src/components/admin/CreateOrganizationModal.jsx
✅ frontend/src/components/admin/EditOrganizationModal.jsx
✅ frontend/src/components/admin/OrganizationMetricsModal.jsx
✅ frontend/src/services/api.js (updated)
✅ frontend/src/pages/Login.jsx (updated)
✅ frontend/src/App.jsx (updated)
```

## 🧪 Quick Test

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapytracker.com","password":"Admin@123"}'
```

### Test Get Organizations (replace TOKEN)
```bash
curl -X GET http://localhost:5000/api/admin/organizations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔐 Security Checklist

- [ ] Run database migration
- [ ] Setup admin password with script
- [ ] Test admin login
- [ ] Change default password
- [ ] Verify role-based access control
- [ ] Test unauthorized access (should return 403)

## 🐛 Common Issues

### Issue: Admin cannot login
**Fix**: Run setup script again
```bash
node backend/database/scripts/setup_admin.js
```

### Issue: Migration fails
**Fix**: Check if admin table exists
```sql
SELECT * FROM admins;
```

### Issue: 403 Forbidden on admin routes
**Fix**: Verify JWT token includes `userType: 'admin'`

### Issue: Organization metrics show 0
**Fix**: Ensure organization has partners and clients assigned

## 📊 Subscription Plans

| Plan | Target | Clients/Month | Model |
|------|--------|---------------|-------|
| **Basic** | Small practices | Up to 10 | Pay per session |
| **Silver** | Medium practices | 10-50 | Fixed monthly |
| **Gold** | Large practices | 50+ | Premium unlimited |

## 🔗 Important Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/admin` | Admin dashboard | Admin only |
| `/admin/organizations` | Organization list | Admin only |
| `/login` | Login page | Public |

## 📞 API Endpoints Summary

```
POST   /api/auth/login                           → Login
GET    /api/admin/organizations                  → List all orgs
POST   /api/admin/organizations                  → Create org
PUT    /api/admin/organizations/:id              → Update org
POST   /api/admin/organizations/:id/deactivate   → Deactivate org
POST   /api/admin/organizations/:id/activate     → Activate org
DELETE /api/admin/organizations/:id              → Delete org
GET    /api/admin/organizations/:id/metrics      → View metrics
GET    /api/admin/dashboard/stats                → Dashboard stats
```

All admin endpoints require:
- Valid JWT token in Authorization header
- User role must be 'admin'

## 💡 Pro Tips

1. **Search is instant** - No need to press Enter
2. **Metrics modal** shows partner breakdown
3. **Deletion requires confirmation** - Type org name to confirm
4. **Deactivation is reversible** - Data is preserved
5. **Dashboard auto-refreshes** after actions

## 📖 Full Documentation

For detailed information, see: `ADMIN_PANEL_SETUP_GUIDE.md`

---

**Need Help?** Check the troubleshooting section in the full guide.

