# Admin Panel Implementation Guide

## Overview

This guide covers the complete setup and usage of the Admin Panel feature for Therapy Tracker. The admin panel allows system administrators to manage organizations, view metrics, and control access to the platform.

## Table of Contents

1. [Features](#features)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Admin Login](#admin-login)
6. [Usage Guide](#usage-guide)
7. [API Endpoints](#api-endpoints)
8. [Troubleshooting](#troubleshooting)

## Features

### ✅ Organization Management
- Create new organizations with complete details
- Edit organization information (name, email, contact, address, GST, subscription)
- Deactivate organizations (soft delete - retains data)
- Activate deactivated organizations
- Permanently delete organizations (hard delete with confirmation)

### ✅ Metrics Dashboard
- View real-time statistics for the entire system
- Track organization-specific metrics:
  - Total partners per organization
  - Total clients per organization
  - Session counts (total, completed, active, monthly)
- Partner-level breakdown with performance metrics

### ✅ Subscription Management
- Three subscription tiers:
  - **Basic**: Up to 10 clients/month
  - **Silver**: 10-50 clients/month
  - **Gold**: 50+ clients/month

### ✅ Access Control
- Admin-only access to management features
- Audit trail for deactivation/deletion actions
- Password-protected admin access

## Database Setup

### Step 1: Run the Migration

Execute the admin support migration to add required tables and columns:

```bash
# Navigate to your PostgreSQL client or use psql
psql -U your_username -d therapy_tracker -f backend/database/migrations/add_admin_support.sql
```

This migration will:
- Create the `admins` table
- Update `auth_credentials` to support 'admin' user type
- Add new columns to `organizations` (gst_no, subscription_plan, is_active, etc.)
- Create necessary indexes
- Insert a default admin record

### Step 2: Set Up Admin Password

Run the admin setup script to generate a secure password hash:

```bash
cd backend
node database/scripts/setup_admin.js
```

**Default Admin Credentials:**
- **Email**: `admin@therapytracker.com`
- **Password**: `Admin@123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

### Step 3: Verify Installation

Check that the admin account was created successfully:

```sql
-- Check admin record
SELECT * FROM admins WHERE email = 'admin@therapytracker.com';

-- Check auth credentials
SELECT user_type, email FROM auth_credentials WHERE user_type = 'admin';

-- Check organization table columns
\d organizations
```

## Backend Setup

### New Files Created

1. **Models**
   - `backend/src/models/Admin.js` - Admin data access layer

2. **Controllers**
   - `backend/src/controllers/adminController.js` - Admin operations

3. **Routes**
   - Added to `backend/src/routes/index.js` under `/admin/*` endpoints

### Updated Files

1. **Organization Model** (`backend/src/models/Organization.js`)
   - Added `deactivate()`, `activate()`, `getMetrics()`, `getAllWithMetrics()`, `getPartnerBreakdown()`
   - Updated `create()` and `update()` to handle new fields

2. **Auth Controller** (`backend/src/controllers/authController.js`)
   - Updated `login()` to handle admin user type
   - Updated `getCurrentUser()` to fetch admin details

### Environment Variables

No new environment variables needed. The system uses existing JWT_SECRET and database configuration.

## Frontend Setup

### New Files Created

1. **Components**
   - `frontend/src/components/layout/AdminLayout.jsx` - Admin panel layout
   - `frontend/src/components/dashboard/AdminDashboard.jsx` - Main admin dashboard
   - `frontend/src/components/admin/CreateOrganizationModal.jsx` - Create organization form
   - `frontend/src/components/admin/EditOrganizationModal.jsx` - Edit organization form
   - `frontend/src/components/admin/OrganizationMetricsModal.jsx` - View organization metrics

### Updated Files

1. **API Service** (`frontend/src/services/api.js`)
   - Added `adminAPI` with all admin endpoints

2. **Router** (`frontend/src/App.jsx`)
   - Added `/admin` routes with admin-only protection
   - Updated login redirect logic to handle admin users

3. **Login Page** (`frontend/src/pages/Login.jsx`)
   - Added admin routing after successful login
   - Added note about admin credentials

## Admin Login

### Access the Admin Panel

1. Navigate to the login page: `http://localhost:3000/login`

2. Enter the admin credentials:
   - **Email**: `admin@therapytracker.com`
   - **Password**: `Admin@123` (or your custom password)

3. Upon successful login, you'll be automatically redirected to: `http://localhost:3000/admin`

### First-Time Setup Checklist

- [ ] Run database migration
- [ ] Run admin setup script
- [ ] Verify admin account in database
- [ ] Test login with default credentials
- [ ] Change default password (recommended)

## Usage Guide

### Dashboard Overview

The admin dashboard displays:

1. **System Statistics Cards**
   - Total Organizations (with active count)
   - Total Partners across all organizations
   - Total Clients (Users)
   - Total Sessions (with monthly count)

2. **Organization List**
   - Searchable by name or email
   - Filterable by status (All, Active, Inactive)
   - Displays key metrics per organization

### Creating an Organization

1. Click the **"Create Organization"** button
2. Fill in the required fields:
   - Organization Name *
   - Email *
   - Contact Number *
   - Address *
   - GST Number (optional)
   - Subscription Plan (optional)
   - Initial Password *
3. Click **"Create Organization"**

The organization can immediately login with the provided credentials.

### Editing an Organization

1. Click the **Edit (pencil)** icon for any organization
2. Modify the fields as needed
3. Click **"Update Organization"**

**Note**: Email changes will require the organization to use the new email for login.

### Viewing Organization Metrics

1. Click the **Metrics (chart)** icon for any organization
2. View detailed breakdown:
   - Overview statistics (partners, clients, sessions)
   - Session status (completed vs active)
   - Partner-level breakdown with performance data

### Deactivating an Organization

1. Click the **Warning** icon for an active organization
2. Confirm the action
3. The organization will:
   - Be unable to login
   - Retain all data
   - Appear in the "Inactive" filter
   - Can be reactivated later

### Activating an Organization

1. Click the **Check Circle** icon for an inactive organization
2. The organization will be immediately reactivated
3. Login access is restored

### Deleting an Organization

⚠️ **WARNING**: This action is permanent and cannot be undone!

1. Click the **Trash** icon
2. Read the deletion warning carefully (shows counts of partners, clients, sessions)
3. Type the organization name exactly to confirm
4. All related data will be permanently deleted:
   - Organization record
   - All partners
   - All clients
   - All sessions
   - All profile data

## API Endpoints

### Admin Authentication

```
POST /api/auth/login
Body: { email, password }
Returns: { token, user: { userType: 'admin', ... } }
```

### Admin Management Endpoints

All endpoints require authentication and admin role.

#### Get All Organizations
```
GET /api/admin/organizations
Headers: Authorization: Bearer <token>
Returns: { organizations: [...] }
```

#### Create Organization
```
POST /api/admin/organizations
Headers: Authorization: Bearer <token>
Body: {
  name, email, contact, address,
  gst_no?, subscription_plan?, password
}
Returns: { organization: {...} }
```

#### Update Organization
```
PUT /api/admin/organizations/:id
Headers: Authorization: Bearer <token>
Body: { name?, email?, contact?, address?, gst_no?, subscription_plan? }
Returns: { organization: {...} }
```

#### Deactivate Organization
```
POST /api/admin/organizations/:id/deactivate
Headers: Authorization: Bearer <token>
Returns: { organization: {...} }
```

#### Activate Organization
```
POST /api/admin/organizations/:id/activate
Headers: Authorization: Bearer <token>
Returns: { organization: {...} }
```

#### Delete Organization
```
DELETE /api/admin/organizations/:id
Headers: Authorization: Bearer <token>
Returns: { success: true }
```

#### Get Organization Metrics
```
GET /api/admin/organizations/:id/metrics
Headers: Authorization: Bearer <token>
Returns: {
  organization: {...},
  metrics: {
    total_partners, total_clients, total_sessions,
    completed_sessions, active_sessions, sessions_this_month
  },
  partnerBreakdown: [...]
}
```

#### Get Dashboard Stats
```
GET /api/admin/dashboard/stats
Headers: Authorization: Bearer <token>
Returns: {
  stats: {
    total_organizations, active_organizations,
    total_partners, total_users, total_sessions, ...
  }
}
```

## Subscription Plans

### Basic Plan
- **Target**: Small practices (up to 10 clients/month)
- **Pricing Model**: Pay per session
- **Features**: Core therapy tracking features

### Silver Plan
- **Target**: Medium practices (10-50 clients/month)
- **Pricing Model**: Fixed monthly subscription
- **Features**: All Basic features + priority support

### Gold Plan
- **Target**: Large practices (50+ clients/month)
- **Pricing Model**: Premium pricing, unlimited clients
- **Features**: All Silver features + advanced analytics + dedicated support

## Security Considerations

1. **Password Security**
   - Admin passwords are hashed using bcrypt (10 salt rounds)
   - Never store passwords in plain text
   - Change default password immediately

2. **Access Control**
   - All admin endpoints require valid JWT token
   - Role-based access control (admin role required)
   - Unauthorized access returns 403 Forbidden

3. **Audit Trail**
   - Deactivation actions record admin ID and timestamp
   - Track who deactivated each organization

4. **Data Protection**
   - Soft delete (deactivate) preserves data for recovery
   - Hard delete requires explicit confirmation
   - Organization name must be typed to confirm deletion

## Troubleshooting

### Admin Cannot Login

**Problem**: "Invalid email or password" error

**Solutions**:
1. Verify admin record exists:
   ```sql
   SELECT * FROM admins WHERE email = 'admin@therapytracker.com';
   ```

2. Verify auth credentials:
   ```sql
   SELECT * FROM auth_credentials WHERE user_type = 'admin';
   ```

3. Re-run the setup script:
   ```bash
   node backend/database/scripts/setup_admin.js
   ```

### Migration Fails

**Problem**: Error running add_admin_support.sql

**Solutions**:
1. Check if tables already exist:
   ```sql
   \dt admins
   ```

2. Manually drop and recreate:
   ```sql
   DROP TABLE IF EXISTS admins CASCADE;
   ```

3. Run migration again

### Organization Metrics Not Loading

**Problem**: Metrics show 0 or don't load

**Solutions**:
1. Verify organization has partners:
   ```sql
   SELECT * FROM partners WHERE organization_id = <org_id>;
   ```

2. Check for data relationships:
   ```sql
   SELECT COUNT(*) FROM user_partner_assignments upa
   JOIN partners p ON upa.partner_id = p.id
   WHERE p.organization_id = <org_id>;
   ```

3. Clear cache and reload page

### Cannot Delete Organization

**Problem**: Delete operation fails

**Solutions**:
1. Check for foreign key constraints
2. Ensure CASCADE is enabled on relationships
3. Verify admin permissions
4. Check database logs for specific errors

## Development Notes

### Adding New Admin Features

To add new admin functionality:

1. **Backend**:
   - Add method to `adminController.js`
   - Add route to `routes/index.js` with `checkRole('admin')`
   - Update models as needed

2. **Frontend**:
   - Add API call to `adminAPI` in `services/api.js`
   - Update `AdminDashboard.jsx` or create new component
   - Add route to `App.jsx` if needed

### Testing Admin Features

```bash
# Test admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapytracker.com","password":"Admin@123"}'

# Test get organizations (replace TOKEN)
curl -X GET http://localhost:5000/api/admin/organizations \
  -H "Authorization: Bearer <TOKEN>"
```

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check database logs: `SELECT * FROM <table> WHERE ...`
4. Check backend logs: Look for `[ADMIN]` prefix messages
5. Contact the development team

## Change Log

### Version 1.0.0 (Initial Release)
- Admin panel implementation
- Organization CRUD operations
- Metrics dashboard
- Subscription plan management
- Soft delete / hard delete functionality
- Audit trail for admin actions

---

**Last Updated**: November 2024
**Version**: 1.0.0

