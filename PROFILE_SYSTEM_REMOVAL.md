# Profile System Removal - Complete Cleanup

## Issue Description

**Problem**: The `user_profiles` and `profile_fields` tables were part of an old sessions-based assessment system that is no longer in use. Despite all application functionalities being tested, these tables contained no records, indicating they are orphaned and unused.

**Impact**:
- Orphaned database tables taking up space
- Unused code creating maintenance burden
- Confusion about which system to use (old profile_fields vs new questionnaires)
- Potential security/integrity risks from unused code paths

## Background

These tables were created as part of an original "sessions-based" assessment system where:
- Partners could create custom profile fields for clients
- Users would rate themselves on various fields during therapy sessions
- Profile history was tracked across sessions

This system has been **completely replaced** by the **questionnaires system**, which provides:
- Structured questionnaires with multiple question types
- Assignment tracking (pending/completed)
- Response management with aggregation
- Chart generation and sharing capabilities
- Session-linked questionnaire responses

## Root Cause

The old profile_fields system was deprecated when the questionnaires system was implemented, but the tables and related code were never removed. A previous migration (`remove_sessions_system.sql`) removed the `sessions` table and session_id columns from profile_fields/user_profiles, but didn't remove the tables themselves.

## What Was Removed

### Database Tables
1. **user_profiles** - Stored user ratings for profile fields
2. **profile_fields** - Stored field definitions (default and custom)

### Database Objects
- Foreign key constraints on profile_fields (fk_profile_fields_created_by_partner, fk_profile_fields_created_by_user)
- Indexes: idx_user_profiles_user, idx_user_profiles_session, idx_profile_fields_user_session, idx_profile_fields_session

### Backend Code
1. **backend/src/models/Profile.js** - Entire model (deleted)
   - Methods: createField, getAllFields, getFieldsBySession, saveUserProfile, getUserProfileBySession, getUserLatestProfile, getAllUserProfiles, getUserProfileHistory

2. **backend/src/controllers/profileController.js** - Entire controller (deleted)
   - Endpoints: getAllFields, createCustomField, getUserProfileData

3. **backend/src/controllers/userController.js** - Updated
   - Removed: Profile import
   - Updated: getUserProfile() to return only user data without profile history

4. **backend/src/controllers/partnerController.js** - Updated
   - Removed: Profile import
   - Updated: getUserProfileForPartner() to return only user data without profile history

5. **backend/src/controllers/adminController.js** - Updated
   - Removed: Step 5 (Delete profile_fields created by partners)
   - Renumbered: Steps 6-8 became Steps 5-7

6. **backend/src/routes/index.js** - Updated
   - Removed: profileController import
   - Removed: GET /profile-fields route
   - Removed: POST /profile-fields route
   - Removed: GET /profile-data/users/:userId route

### Frontend Code
1. **frontend/src/services/api.js** - Updated
   - Removed: profileAPI object (getAllFields, createField, getUserProfileData)

### Documentation Files Updated
- PROFILE_FIELDS_FIX.md - Now obsolete (referenced system no longer exists)
- ORGANIZATION_DELETE_FIX.md - Removed profile_fields deletion references

## Files Changed

### Created
- `backend/database/migrations/remove_user_profiles_and_profile_fields.sql` - Migration to drop tables
- `PROFILE_SYSTEM_REMOVAL.md` - This documentation file

### Deleted
- `backend/src/models/Profile.js`
- `backend/src/controllers/profileController.js`

### Modified
- `backend/src/controllers/userController.js` (getUserProfile function)
- `backend/src/controllers/partnerController.js` (getUserProfileForPartner function)
- `backend/src/controllers/adminController.js` (deleted Step 5, renumbered steps)
- `backend/src/routes/index.js` (removed profile routes and controller import)
- `frontend/src/services/api.js` (removed profileAPI)

## How to Apply the Removal

### Step 1: Backup Database

**CRITICAL**: Always backup before running destructive migrations!

```bash
pg_dump -U your_username -d therapy_tracker > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Database Migration

```bash
psql -U your_username -d therapy_tracker -f backend/database/migrations/remove_user_profiles_and_profile_fields.sql
```

Expected output:
```
NOTICE:  profile_fields table has X records
NOTICE:  user_profiles table has Y records
NOTICE:  Dropped user_profiles table
NOTICE:  Dropped profile_fields table
NOTICE:  ========================================
NOTICE:  Migration completed successfully!
NOTICE:  Removed tables: user_profiles, profile_fields
NOTICE:  ========================================
```

### Step 3: Deploy Updated Code

The code changes are already in place. Simply deploy the updated backend and frontend:

```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start
```

### Step 4: Verify Removal

1. **Check tables are gone:**
```sql
-- Should return 0 rows
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('user_profiles', 'profile_fields');
```

2. **Test API endpoints:**
```bash
# These should return 404 or proper errors (routes removed)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/profile-fields
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/profile-data/users/1
```

3. **Test user profile endpoint:**
```bash
# Should return user data without profileHistory
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/users/1/profile
```

4. **Test application functionality:**
   - User login and dashboard
   - Questionnaires system (create, assign, complete, view responses)
   - Charts & insights
   - Organization/partner management
   - All existing features should work normally

## What to Use Instead

For assessment and tracking:

### ✅ Use Questionnaires System

**For Partners/Therapists:**
```javascript
// Create a questionnaire
questionnaireAPI.create({
  name: 'Weekly Check-in',
  description: 'Track client progress',
  questions: [/* question objects */]
});

// Assign to client
questionnaireAPI.assign({
  questionnaire_id: 123,
  user_id: 456,
  due_date: '2025-02-15'
});

// View responses
questionnaireAPI.getResponses(assignmentId);
```

**For Clients/Users:**
```javascript
// Get assigned questionnaires
questionnaireAPI.getUserAssignments(userId);

// Submit responses
questionnaireAPI.saveResponses(assignmentId, responses);

// View history
questionnaireAPI.getUserHistory(userId, questionnaireId);
```

**For Charts & Insights:**
```javascript
// Share comparison chart
chartAPI.shareQuestionnaireChart({
  user_id: 123,
  questionnaire_id: 456,
  selected_assignments: [1, 2, 3, 4],
  chart_display_type: 'radar' // or 'line', 'bar'
});
```

## Benefits of Removal

1. **Cleaner Codebase**: Removed ~500 lines of unused code
2. **Reduced Complexity**: Single assessment system (questionnaires only)
3. **Better Maintainability**: No confusion about which system to use
4. **Database Cleanup**: Removed 2 unused tables and related constraints
5. **Security**: Eliminated unused code paths that could have vulnerabilities
6. **Performance**: Fewer tables to maintain, cleaner queries
7. **Developer Experience**: Clear direction - always use questionnaires for assessments

## Testing Checklist

After applying the removal:

- [ ] Database migration runs successfully
- [ ] user_profiles table is dropped
- [ ] profile_fields table is dropped
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] User login works
- [ ] User dashboard displays correctly
- [ ] Questionnaires can be created
- [ ] Questionnaires can be assigned
- [ ] Questionnaires can be completed
- [ ] Questionnaire responses can be viewed
- [ ] Charts can be shared
- [ ] Charts display in user dashboard
- [ ] Organization deletion works
- [ ] Partner deletion works
- [ ] User deletion works
- [ ] All existing API endpoints work
- [ ] No console errors in browser
- [ ] No errors in backend logs

## Rollback Plan

If issues arise, the rollback process is:

### 1. Restore Database Tables

```sql
-- Recreate profile_fields table
CREATE TABLE profile_fields (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('rating_5', 'rating_4', 'energy_levels', 'sleep_quality')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Emotional Well-being', 'Social & Relationships', 'Physical Health', 'Daily Functioning', 'Self-Care & Coping', 'Others')),
    is_default BOOLEAN DEFAULT FALSE,
    created_by_user_id INTEGER,
    created_by_partner_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate user_profiles table
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_id INTEGER NOT NULL REFERENCES profile_fields(id) ON DELETE CASCADE,
    rating_value VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate indexes
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_profile_fields_user_session ON profile_fields(user_id);
```

### 2. Restore Code from Git

```bash
git checkout HEAD~1 backend/src/models/Profile.js
git checkout HEAD~1 backend/src/controllers/profileController.js
git checkout HEAD~1 backend/src/controllers/userController.js
git checkout HEAD~1 backend/src/controllers/partnerController.js
git checkout HEAD~1 backend/src/controllers/adminController.js
git checkout HEAD~1 backend/src/routes/index.js
git checkout HEAD~1 frontend/src/services/api.js
```

### 3. Restart Services

```bash
cd backend && npm start
cd frontend && npm start
```

## Related Documentation

- **Questionnaires System**: See QUESTIONNAIRE_SYSTEM_SUMMARY.md
- **Assessment Implementation**: See ASSESSMENT_QUESTIONNAIRE_IMPLEMENTATION.md
- **Custom Questionnaires**: See CUSTOM_QUESTIONNAIRE_IMPLEMENTATION.md
- **Charts & Insights**: See chart sharing documentation

---

**Migration Date**: 2025-01-29
**Status**: ✅ Completed
**Impact**: Low (tables were unused)
**Risk**: Low (comprehensive rollback available)
