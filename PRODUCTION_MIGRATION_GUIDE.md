# Production Database Migration Guide

## Current Issue
Your production database is missing several columns and tables that exist in your codebase, causing errors like:
- `column "default_report_background" of relation "partners" does not exist`
- `column "family_history_consanguinity" of relation "case_histories" does not exist`

## Solution
Run the comprehensive migration script to sync your production database with your codebase.

---

## Method 1: Using Render Dashboard Shell (Recommended)

### Step 1: Access Render Database Shell
1. Log in to your [Render Dashboard](https://dashboard.render.com)
2. Navigate to your PostgreSQL database service
3. Click on the **"Shell"** tab to open a PostgreSQL shell

### Step 2: Copy and Paste Migration SQL

Open the file `backend/database/migrations/production_sync_migration.sql` and copy the entire contents.

Paste it into the Render shell and press Enter.

### Step 3: Verify Migration Success

Run this verification query in the shell:

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('partners', 'case_histories', 'generated_reports', 'report_templates', 'case_history_family_members')
ORDER BY table_name, ordinal_position;
```

You should see all the new columns listed.

---

## Method 2: Using psql from Local Machine

### Prerequisites
- PostgreSQL client installed (`psql` command)
- Production database connection string from Render

### Steps

1. **Get your database connection string:**
   - Go to Render Dashboard → Your Database → "Info" tab
   - Copy the "External Database URL"

2. **Run the migration:**

```bash
psql "your-render-database-url" -f backend/database/migrations/production_sync_migration.sql
```

Replace `your-render-database-url` with your actual connection string.

---

## Method 3: Using a Node.js Migration Script

If you prefer an automated approach, you can create a migration runner. Let me know if you'd like me to create this for you.

---

## What This Migration Adds

### Tables Created:
1. **report_templates** - Admin-uploaded DOCX templates for reports
2. **generated_reports** - Partner-created reports with sharing functionality

### Columns Added to `partners`:
- `default_report_template_id` - Default report template selection
- `qualification` - Professional qualification (e.g., M.A. Clinical Psychology)
- `default_report_background` - Background image filename for reports
- `license_id` - Professional license/registration number

### Columns Added to `case_histories`:
- `family_history_consanguinity` - Consolidated consanguinity field (combines old present/absent fields)

### Columns Added to `generated_reports`:
- `viewed_at` - Timestamp when client first viewed the report

### Columns Added to `case_history_family_members`:
- `sex` - Gender of family member

### Columns Added to `mental_status_examinations` (if table exists):
- `behavior_observation` - Detailed behavior observations

---

## After Migration

Once the migration is complete:

1. ✅ Test changing report background - should work without errors
2. ✅ Test saving case history - should work without errors
3. ✅ Test all report-related features
4. ✅ Verify all partner profile updates work correctly

---

## Rollback (Emergency Only)

If something goes wrong, you can rollback by running:

```sql
BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;

-- Remove new columns
ALTER TABLE partners DROP COLUMN IF EXISTS default_report_template_id;
ALTER TABLE partners DROP COLUMN IF EXISTS qualification;
ALTER TABLE partners DROP COLUMN IF EXISTS default_report_background;
ALTER TABLE partners DROP COLUMN IF EXISTS license_id;
ALTER TABLE case_histories DROP COLUMN IF EXISTS family_history_consanguinity;
ALTER TABLE generated_reports DROP COLUMN IF EXISTS viewed_at;
ALTER TABLE case_history_family_members DROP COLUMN IF EXISTS sex;
ALTER TABLE mental_status_examinations DROP COLUMN IF EXISTS behavior_observation;

COMMIT;
```

**⚠️ WARNING:** Only use rollback if absolutely necessary and you have backups!

---

## Troubleshooting

### Error: "relation already exists"
- This is normal if the table was partially created. The script uses `IF NOT EXISTS` so it's safe to run multiple times.

### Error: "permission denied"
- Ensure your database user has ALTER TABLE and CREATE TABLE permissions
- On Render, the default user should have these permissions

### Error: "column already exists"
- This is normal if some migrations were already run. The script uses `IF NOT EXISTS` so it's safe.

---

## Need Help?

If you encounter any issues:
1. Check the Render database logs
2. Verify you're connected to the correct database
3. Ensure no active connections are blocking the migration
4. Create a database backup before running (Render provides automated backups)
