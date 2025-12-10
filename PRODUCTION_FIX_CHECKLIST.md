# Production Fix Checklist

## Issues Identified

### 1. ✅ Code Bug: CaseHistory INSERT Query (FIXED)
**Error**: `INSERT has more target columns than expressions`

**Root Cause**: The INSERT VALUES clause had 145 placeholders but needed 147

**Status**: ✅ **FIXED** in `backend/src/models/CaseHistory.js:428`

---

### 2. ⏳ Database Migration: Missing Columns (PENDING)
**Errors**:
- `column "default_report_background" of relation "partners" does not exist`
- `column "family_history_consanguinity" of relation "case_histories" does not exist`

**Root Cause**: Production database is missing recent schema updates

**Status**: ⏳ **NEEDS MIGRATION**

---

## Deployment Steps

### Step 1: Deploy Code Fix (First)

Deploy the updated code with the fixed CaseHistory INSERT query:

```bash
git add backend/src/models/CaseHistory.js
git commit -m "fix: Add missing placeholders $146, $147 in CaseHistory INSERT query"
git push
```

Wait for Render to deploy the new code.

---

### Step 2: Run Database Migration (After Code is Deployed)

**Important**: Run this AFTER the code fix is deployed!

#### Option A: Using Render Database Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to your PostgreSQL database service
3. Click **"Shell"** tab
4. Copy and paste the contents of `backend/database/migrations/production_sync_migration.sql`
5. Press Enter to execute

#### Option B: Using psql Command

```bash
psql "your-render-database-url" -f backend/database/migrations/production_sync_migration.sql
```

---

### Step 3: Verify Everything Works

After both steps are complete, test these features:

1. ✅ **Save Case History** - Should work without "INSERT has more target columns" error
2. ✅ **Change Report Background** - Should work without "column does not exist" error
3. ✅ **Partner Profile Updates** - Should work with new qualification and license_id fields
4. ✅ **Report Generation** - Should work with new report templates and backgrounds

---

## What the Migration Adds

### New Tables:
- `report_templates` - Admin-uploaded report templates
- `generated_reports` - Partner-created reports

### New Columns in `partners`:
- `default_report_template_id` - Selected report template
- `qualification` - Professional qualification
- `default_report_background` - Report background image
- `license_id` - Professional license number

### New Columns in `case_histories`:
- `family_history_consanguinity` - Consolidated consanguinity field

### New Columns in `generated_reports`:
- `viewed_at` - When client viewed report

### New Columns in `case_history_family_members`:
- `sex` - Family member gender

### New Columns in `mental_status_examinations`:
- `behavior_observation` - Behavior notes

---

## Troubleshooting

### If Step 1 (Code Deploy) Fails
- Check Render deployment logs
- Verify the code change was pushed correctly
- Ensure there are no syntax errors

### If Step 2 (Migration) Fails

**Error: "relation already exists"**
- Safe to ignore - means table was already created
- The script uses `IF NOT EXISTS` so it's idempotent

**Error: "column already exists"**
- Safe to ignore - means column was already added
- The script uses `IF NOT EXISTS` so it's idempotent

**Error: "permission denied"**
- Ensure you're using the database owner credentials
- On Render, use the default database user

### If Features Still Don't Work After Both Steps

1. Verify migration ran successfully:
```sql
-- Check if new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'partners'
AND column_name IN ('default_report_background', 'qualification', 'license_id');
```

2. Check application logs on Render for specific errors

3. Restart the web service on Render to pick up changes

---

## Summary

- ✅ **Code fix completed**: Added $146, $147 to INSERT query
- ⏳ **Migration pending**: Run `production_sync_migration.sql` on production database
- 📝 **Next step**: Deploy code, then run migration

Once both steps are complete, all production errors should be resolved!
