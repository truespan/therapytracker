# Admin Panel Testing Checklist

This checklist ensures all admin panel features are working correctly.

## 🔧 Setup Verification

### Database Setup
- [ ] Migration executed successfully
- [ ] `admins` table created
- [ ] `organizations` table has new columns (gst_no, subscription_plan, is_active, etc.)
- [ ] Admin record exists in database
- [ ] Auth credentials exist for admin
- [ ] All indexes created

**Verification Commands:**
```sql
-- Check tables
\dt admins
\d organizations

-- Check admin record
SELECT * FROM admins WHERE email = 'admin@therapytracker.com';

-- Check auth credentials
SELECT user_type, email FROM auth_credentials WHERE user_type = 'admin';

-- Check new columns
\d+ organizations
```

### Backend Setup
- [ ] Admin model file exists
- [ ] Admin controller file exists
- [ ] Organization model has new methods
- [ ] Auth controller handles admin login
- [ ] Admin routes added to index.js
- [ ] Backend server starts without errors

**Verification Commands:**
```bash
# Start backend
cd backend
npm start

# Should see no errors
# Routes should be loaded
```

### Frontend Setup
- [ ] AdminLayout component exists
- [ ] AdminDashboard component exists
- [ ] All admin modal components exist
- [ ] API service has adminAPI
- [ ] Router has admin routes
- [ ] Login page updated
- [ ] Frontend builds without errors

**Verification Commands:**
```bash
# Start frontend
cd frontend
npm start

# Should see no compilation errors
```

## 🔐 Authentication Testing

### Admin Login
- [ ] Can access login page
- [ ] Can login with default credentials
- [ ] Redirects to `/admin` after login
- [ ] JWT token contains `userType: 'admin'`
- [ ] Token stored in localStorage
- [ ] User object stored in localStorage

**Test Steps:**
1. Navigate to `http://localhost:3000/login`
2. Enter: `admin@therapytracker.com` / `Admin@123`
3. Click "Sign In"
4. Should redirect to admin dashboard
5. Check browser console: `localStorage.getItem('token')`
6. Check user type: `JSON.parse(localStorage.getItem('user')).userType` should be 'admin'

### Failed Login
- [ ] Invalid email shows error
- [ ] Invalid password shows error
- [ ] Error message is user-friendly
- [ ] Form doesn't clear on error

**Test Steps:**
1. Try wrong email: Should show "Invalid email or password"
2. Try wrong password: Should show "Invalid email or password"
3. Try empty fields: Should show validation errors

### Unauthorized Access
- [ ] Non-admin users cannot access `/admin`
- [ ] Returns 403 on admin API calls without admin role
- [ ] Redirects to home if not authenticated

**Test Steps:**
1. Logout if logged in
2. Navigate to `http://localhost:3000/admin`
3. Should redirect to login
4. Login as organization user
5. Try to access `/admin`
6. Should be denied/redirected

## 📊 Dashboard Testing

### Dashboard Display
- [ ] Dashboard loads without errors
- [ ] Statistics cards display correctly
- [ ] All 4 stat cards show numbers
- [ ] Organization table loads
- [ ] Search bar is functional
- [ ] Filter buttons work
- [ ] Create button is visible

**Test Steps:**
1. Login as admin
2. Verify all stats show (may be 0 if no data)
3. Verify organization list appears
4. Try searching
5. Try filtering

### Statistics Accuracy
- [ ] Total Organizations count is correct
- [ ] Active Organizations count is correct
- [ ] Total Partners count is correct
- [ ] Total Clients count is correct
- [ ] Total Sessions count is correct
- [ ] Sessions This Month count is correct

**Verification:**
```sql
-- Verify counts
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM organizations WHERE is_active = true;
SELECT COUNT(*) FROM partners;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM sessions 
WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
```

## 🏢 Organization Management

### Create Organization
- [ ] Modal opens on button click
- [ ] All fields are present
- [ ] Required fields are marked with *
- [ ] Email validation works
- [ ] Phone validation works
- [ ] Subscription dropdown has 3 options
- [ ] Can submit with valid data
- [ ] Shows success message
- [ ] Organization appears in list
- [ ] Can login with new organization credentials
- [ ] Error handling for duplicate email

**Test Cases:**
1. **Valid Creation**
   - Name: Test Org 1
   - Email: testorg1@example.com
   - Contact: 1234567890
   - Address: 123 Test St
   - GST: Optional
   - Plan: Basic
   - Password: Test@123
   - Should succeed

2. **Duplicate Email**
   - Try creating with same email
   - Should show error: "Email already registered"

3. **Invalid Data**
   - Empty required fields → Should show validation errors
   - Invalid email format → Should show error
   - Short phone number → Should show error
   - Short password → Should show error

### Edit Organization
- [ ] Modal opens on edit icon click
- [ ] Pre-fills with current data
- [ ] Can update each field
- [ ] Saves changes successfully
- [ ] Shows success message
- [ ] Updates reflect in list
- [ ] Email change updates auth credentials
- [ ] Error handling for duplicate email

**Test Cases:**
1. **Update Name**
   - Change organization name
   - Save
   - Verify in list

2. **Update Email**
   - Change email
   - Save
   - Try logging in with old email → Should fail
   - Try logging in with new email → Should succeed

3. **Update Subscription Plan**
   - Change from Basic to Silver
   - Save
   - Verify badge shows "silver"

### Deactivate Organization
- [ ] Confirmation dialog appears
- [ ] Can cancel deactivation
- [ ] Can confirm deactivation
- [ ] Status changes to Inactive
- [ ] Badge shows red "Inactive"
- [ ] Organization cannot login
- [ ] Data is preserved
- [ ] Shows in "Inactive" filter
- [ ] Deactivation info recorded (admin_id, timestamp)

**Test Steps:**
1. Click warning icon on active org
2. Read confirmation → Cancel
3. Org should stay active
4. Click warning icon again → Confirm
5. Org should become inactive
6. Try logging in as that org → Should fail
7. Verify in database:
   ```sql
   SELECT is_active, deactivated_at, deactivated_by 
   FROM organizations WHERE id = <org_id>;
   ```

### Activate Organization
- [ ] Check icon appears for inactive orgs
- [ ] Can activate organization
- [ ] Status changes to Active
- [ ] Badge shows green "Active"
- [ ] Organization can login again
- [ ] Deactivation info cleared

**Test Steps:**
1. Click check icon on inactive org
2. Org should become active
3. Try logging in as that org → Should succeed

### Delete Organization
- [ ] Warning dialog appears with counts
- [ ] Shows partners, clients, sessions counts
- [ ] Requires typing org name
- [ ] Wrong name cancels deletion
- [ ] Correct name deletes
- [ ] Organization removed from list
- [ ] Auth credentials deleted
- [ ] All related data deleted (cascade)
- [ ] Cannot login anymore

**Test Steps:**
1. Click trash icon
2. Read warning showing counts
3. Type wrong name → Should cancel
4. Click trash icon again
5. Type exact org name → Should delete
6. Verify org gone from list
7. Verify deleted from database:
   ```sql
   SELECT * FROM organizations WHERE id = <org_id>;
   -- Should return no rows
   ```

## 📈 Metrics Testing

### View Organization Metrics
- [ ] Modal opens on metrics icon click
- [ ] Organization name displayed
- [ ] Overview stats load
- [ ] Session status shows
- [ ] Partner breakdown table loads
- [ ] All columns populated
- [ ] Partner ID badges display
- [ ] Organization details shown
- [ ] Close button works

**Test Steps:**
1. Click metrics icon for any org
2. Verify all sections load:
   - Total Partners
   - Total Clients
   - Total Sessions
   - Sessions This Month
   - Completed Sessions
   - Active Sessions
   - Partner Breakdown table

### Metrics Accuracy
- [ ] Partner count matches database
- [ ] Client count matches database
- [ ] Session counts match database
- [ ] Partner breakdown sums correctly

**Verification:**
```sql
-- For org_id = X
SELECT 
  COUNT(DISTINCT p.id) as partners,
  COUNT(DISTINCT u.id) as clients,
  COUNT(DISTINCT s.id) as sessions
FROM organizations o
LEFT JOIN partners p ON o.id = p.organization_id
LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
LEFT JOIN users u ON upa.user_id = u.id
LEFT JOIN sessions s ON p.id = s.partner_id
WHERE o.id = X;
```

## 🔍 Search and Filter

### Search Functionality
- [ ] Search by organization name works
- [ ] Search by email works
- [ ] Search is case-insensitive
- [ ] Search is instant (no delay)
- [ ] Clear search shows all orgs
- [ ] Search with no results shows message

**Test Cases:**
1. Search for existing org name → Should filter
2. Search for email → Should filter
3. Search for partial match → Should filter
4. Search for non-existent → Should show "No organizations found"
5. Clear search → Should show all again

### Filter Functionality
- [ ] "All" filter shows all organizations
- [ ] "Active" filter shows only active
- [ ] "Inactive" filter shows only inactive
- [ ] Filter counts are accurate
- [ ] Filter persists during search
- [ ] Active filter badge is highlighted

**Test Cases:**
1. Click "All" → Should show all orgs
2. Click "Active" → Should show only active orgs
3. Click "Inactive" → Should show only inactive orgs
4. Verify counts match displayed results

## 🎨 UI/UX Testing

### Layout and Design
- [ ] Admin layout displays correctly
- [ ] Header shows admin badge
- [ ] Sidebar/tabs work
- [ ] Dashboard is responsive
- [ ] Tables scroll horizontally on small screens
- [ ] Modals are centered
- [ ] Buttons have hover effects
- [ ] Icons display correctly
- [ ] Colors follow theme

### Loading States
- [ ] Dashboard shows loading spinner
- [ ] Modals show loading state
- [ ] Buttons disable during operations
- [ ] Loading text appears ("Creating...", "Updating...")
- [ ] No duplicate submissions possible

### Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Form validation errors display inline
- [ ] Success messages appear
- [ ] Errors don't break the UI

## 🔄 Integration Testing

### Cross-Feature Testing
- [ ] Create org → Edit → Works
- [ ] Create org → View metrics → Works
- [ ] Create org → Deactivate → Activate → Works
- [ ] Create org → Login as org → Works
- [ ] Edit org email → Login with new email → Works
- [ ] Deactivate org → Cannot login → Works
- [ ] Activate org → Can login → Works

### Admin Session
- [ ] Admin can logout
- [ ] Admin can navigate back
- [ ] Token persists on refresh
- [ ] Session expires after 7 days
- [ ] Expired token redirects to login

## 📱 Browser Testing

Test on multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Test responsive design:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## 🚀 Performance Testing

- [ ] Dashboard loads within 2 seconds
- [ ] Search responds instantly
- [ ] Modals open without delay
- [ ] Large organization lists (100+) render smoothly
- [ ] Metrics modal loads within 1 second
- [ ] No memory leaks on long sessions

## 🔒 Security Testing

- [ ] SQL injection attempts fail
- [ ] XSS attempts are sanitized
- [ ] CSRF protection works
- [ ] JWT tokens expire
- [ ] Invalid tokens rejected
- [ ] Admin routes require authentication
- [ ] Non-admin users blocked from admin routes
- [ ] Password hashing works (bcrypt)
- [ ] Passwords not visible in logs
- [ ] Passwords not returned in API responses

## 📝 Final Checklist

### Documentation
- [ ] Setup guide is complete
- [ ] Quick start guide exists
- [ ] API documentation is accurate
- [ ] Code is commented
- [ ] Database schema documented

### Code Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] Code follows project standards
- [ ] No unused imports
- [ ] No hardcoded values
- [ ] Environment variables used correctly

### Deployment Ready
- [ ] Migration scripts work
- [ ] Setup scripts work
- [ ] Environment variables documented
- [ ] Database backups tested
- [ ] Rollback plan exists

---

## ✅ Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**All Tests Passed:** [ ] Yes [ ] No  
**Issues Found:** ___________________  
**Ready for Production:** [ ] Yes [ ] No  

**Notes:**
_____________________________________
_____________________________________
_____________________________________

