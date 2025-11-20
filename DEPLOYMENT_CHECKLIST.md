# Partner ID System - Deployment Checklist

## Pre-Deployment

### 1. Database Backup
- [ ] Create a full backup of the production database
- [ ] Verify backup integrity
- [ ] Document rollback procedure

### 2. Code Review
- [ ] Review all modified files:
  - [ ] `backend/database/schema.sql`
  - [ ] `backend/src/models/Partner.js`
  - [ ] `backend/src/controllers/authController.js`
  - [ ] `frontend/src/pages/Signup.jsx`
  - [ ] `frontend/src/components/dashboard/PartnerDashboard.jsx`
  - [ ] `frontend/src/components/dashboard/OrganizationDashboard.jsx`
- [ ] Verify no linting errors
- [ ] Check for console.log statements or debug code

### 3. Testing
- [ ] Test Partner ID generation for new partners
- [ ] Test user signup with valid Partner ID
- [ ] Test user signup with invalid Partner ID
- [ ] Test user signup without Partner ID
- [ ] Test Partner ID display on partner dashboard
- [ ] Test Partner ID copy-to-clipboard functionality
- [ ] Test Partner ID display on organization dashboard
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS, Android)

---

## Deployment Steps

### Step 1: Database Migration (For Existing Databases)

#### Option A: Fresh Installation
If this is a new installation, the schema already includes the partner_id column:
- [ ] Run `backend/database/schema.sql` as normal
- [ ] No additional migration needed

#### Option B: Existing Database
If you have existing partners in the database:

1. **Add the column (nullable initially):**
```sql
ALTER TABLE partners ADD COLUMN partner_id VARCHAR(7);
CREATE INDEX idx_partners_partner_id ON partners(partner_id);
```
- [ ] Execute the above SQL

2. **Populate Partner IDs for existing partners:**
```bash
cd backend/database/scripts
node populate_partner_ids.js
```
- [ ] Run the population script
- [ ] Verify all partners have Partner IDs
- [ ] Check for any errors in the output

3. **Add constraints:**
```sql
ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL;
ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id);
```
- [ ] Execute the above SQL after confirming all partners have IDs

### Step 2: Backend Deployment
- [ ] Deploy backend code changes
- [ ] Restart backend server
- [ ] Verify backend is running without errors
- [ ] Check backend logs for any issues

### Step 3: Frontend Deployment
- [ ] Build frontend with production settings
  ```bash
  cd frontend
  npm run build
  ```
- [ ] Deploy frontend build
- [ ] Clear browser cache
- [ ] Verify frontend loads correctly

### Step 4: Smoke Testing
- [ ] Test partner signup (new partner should get Partner ID)
- [ ] Test partner login and dashboard (Partner ID should display)
- [ ] Test user signup with valid Partner ID
- [ ] Test user signup with invalid Partner ID
- [ ] Test copy-to-clipboard on partner dashboard
- [ ] Test organization dashboard (Partner IDs should display)

---

## Post-Deployment

### 1. Monitoring
- [ ] Monitor error logs for 24-48 hours
- [ ] Check for any Partner ID generation failures
- [ ] Monitor user signup success rate
- [ ] Track any user-reported issues

### 2. Communication

#### To Organizations:
- [ ] Send email explaining the new Partner ID system
- [ ] Provide instructions on where to find Partner IDs
- [ ] Explain the benefits of the new system

#### To Partners/Therapists:
- [ ] Notify about their new Partner ID
- [ ] Explain how to find and share their Partner ID
- [ ] Provide the user guide (PARTNER_ID_USER_GUIDE.md)
- [ ] Explain that new patients will need this ID to sign up

#### To Users/Patients:
- [ ] Update signup instructions
- [ ] Explain that they need a Partner ID from their therapist
- [ ] Provide help documentation

### 3. Documentation
- [ ] Update API documentation (if applicable)
- [ ] Update user manual
- [ ] Update training materials
- [ ] Add Partner ID system to FAQ

### 4. Data Verification
- [ ] Verify all existing partners have Partner IDs
- [ ] Check for any duplicate Partner IDs (should be none)
- [ ] Verify user-partner assignments are working correctly
- [ ] Run database integrity checks

---

## Rollback Plan (If Needed)

### If Issues Are Detected:

1. **Backend Rollback:**
   - [ ] Revert to previous backend version
   - [ ] Restart backend server

2. **Frontend Rollback:**
   - [ ] Revert to previous frontend build
   - [ ] Clear CDN cache (if applicable)

3. **Database Rollback:**
   - [ ] Restore from backup (if necessary)
   - [ ] Or remove partner_id column:
   ```sql
   ALTER TABLE partners DROP COLUMN partner_id;
   DROP INDEX IF EXISTS idx_partners_partner_id;
   ```

4. **Communication:**
   - [ ] Notify users of temporary issues
   - [ ] Provide timeline for resolution

---

## Success Criteria

The deployment is successful when:
- [ ] All existing partners have unique Partner IDs
- [ ] New partners automatically receive Partner IDs upon signup
- [ ] Partner IDs are displayed correctly on partner dashboard
- [ ] Partner IDs are displayed correctly on organization dashboard
- [ ] Copy-to-clipboard functionality works
- [ ] Users can sign up with valid Partner IDs
- [ ] Users cannot sign up with invalid Partner IDs
- [ ] User-partner linking happens automatically
- [ ] No errors in logs related to Partner ID system
- [ ] No user-reported issues for 48 hours

---

## Contact Information

**Technical Issues:**
- Backend Developer: [Contact Info]
- Frontend Developer: [Contact Info]
- Database Administrator: [Contact Info]

**User Support:**
- Support Email: [Email]
- Support Phone: [Phone]
- Help Desk: [URL]

---

## Notes

- Partner IDs are permanent and cannot be changed
- Partner IDs are not case-sensitive (auto-converted to uppercase)
- Partner IDs can be shared freely (not sensitive information)
- Each partner can have unlimited users/patients
- Organizations can see all Partner IDs for their therapists

---

## Timeline

**Estimated Deployment Time:** 1-2 hours (depending on number of existing partners)

**Recommended Deployment Window:**
- Off-peak hours (e.g., late evening or early morning)
- Low-traffic day (e.g., weekend)
- Have technical team on standby for 2-4 hours post-deployment

**Post-Deployment Monitoring Period:** 48 hours minimum

