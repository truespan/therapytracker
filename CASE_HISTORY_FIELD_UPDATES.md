# Case History Field Updates

## Summary of Changes

### 1. Consanguinity Field Simplification
**Before:**
- Two separate fields:
  - `family_history_consanguinity_present` (textarea)
  - `family_history_consanguinity_absent` (textarea)

**After:**
- Single field:
  - `family_history_consanguinity` (single-line text)
  - Label: "Consanguinity (Present / Absent)"

### 2. Expressed Emotion Fields - Field Type Change
**Before:** All fields were multi-line text areas (textarea)

**After:** All fields changed to single-line text inputs

Fields affected:
- a) Warmth
- b) Hostility
- c) Critical comments
- d) Emotional Over involvement
- e) Reinforcement

## Files Modified

### Database
1. **backend/database/case_history_schema.sql**
   - Removed: `family_history_consanguinity_present TEXT`
   - Removed: `family_history_consanguinity_absent TEXT`
   - Added: `family_history_consanguinity TEXT`

2. **backend/database/migrations/update_case_history_fields.sql** (NEW)
   - Migration script to update existing database
   - Combines the two consanguinity fields into one
   - Preserves existing data from both old fields

### Backend
3. **backend/src/models/CaseHistory.js**
   - Updated field names in destructuring (line 70)
   - Updated UPDATE query (line 236)
   - Updated INSERT query (line 400)
   - Updated values arrays (lines 352, 445)
   - Decremented all subsequent parameter numbers from $47 onwards

### Frontend
4. **frontend/src/components/casehistory/CaseHistoryForm.jsx**
   - Updated initial state (lines 65-66)
   - Updated reset state (lines 257-258)
   - Updated data loading from API (lines 452-453)
   - Changed expressed emotion fields from 'textarea' to 'text' (lines 1095-1099)
   - Replaced two consanguinity fields with one (line 1102)

## Migration Steps

To apply these changes to an existing database:

1. **Run the SQL migration:**
   ```bash
   psql -U your_username -d your_database -f backend/database/migrations/update_case_history_fields.sql
   ```

2. **Restart the backend server** to load the updated model

3. **Clear browser cache** and reload the frontend

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Existing case history data loads correctly
- [ ] New consanguinity field displays as single-line text
- [ ] Expressed emotion fields display as single-line text inputs
- [ ] Can save new case history data
- [ ] Can update existing case history data
- [ ] Data validation works correctly
- [ ] No console errors in browser or backend

## Rollback (if needed)

If you need to rollback these changes:

1. Restore the database schema:
   ```sql
   ALTER TABLE case_histories ADD COLUMN family_history_consanguinity_present TEXT;
   ALTER TABLE case_histories ADD COLUMN family_history_consanguinity_absent TEXT;

   UPDATE case_histories
   SET family_history_consanguinity_present = family_history_consanguinity
   WHERE family_history_consanguinity IS NOT NULL;

   ALTER TABLE case_histories DROP COLUMN family_history_consanguinity;
   ```

2. Restore backend files from git:
   ```bash
   git checkout backend/src/models/CaseHistory.js
   ```

3. Restore frontend files from git:
   ```bash
   git checkout frontend/src/components/casehistory/CaseHistoryForm.jsx
   ```
