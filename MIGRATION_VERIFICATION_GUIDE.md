# Migration Verification Guide

This guide explains how to use the migration verification script to check if your production PostgreSQL database has all the same migrations as your local database.

## Overview

The verification script ([`verify-migrations.js`](backend/verify-migrations.js)) provides a comprehensive check of your database migration status by:

1. **Analyzing migration files** - Scans your migrations directory to identify all available migration files
2. **Checking migration tracking** - Looks for a `migrations` table to see which migrations have been formally tracked
3. **Verifying actual schema** - Checks if critical tables and columns exist in the database
4. **Comparing environments** - Identifies differences between your local and production databases

## Quick Start

### 1. Install Dependencies

Make sure you have the PostgreSQL client library installed:

```bash
cd backend
npm install pg
```

### 2. Set Up Environment Files

Ensure you have the following files configured:

**Local Environment** (`backend/.env`):
```
DATABASE_URL=postgresql://username:password@localhost:5432/therapy_tracker
```

**Production Environment** (`backend/.env.production`):
```
DATABASE_URL=postgresql://username:password@your-production-host:5432/therapy_tracker
```

### 3. Run Verification

#### Check Local Database:
```bash
cd backend
node verify-migrations.js local
```

#### Check Production Database:
```bash
cd backend
node verify-migrations.js production
```

#### Use Direct Connection String:
```bash
cd backend
node verify-migrations.js postgres://user:pass@host:5432/dbname
```

## Understanding the Results

### Sample Output Analysis

```
============================================================
MIGRATION FILES ANALYSIS
============================================================
Found 56 migration files in: d:\cursor\therapy-tracker\backend\database\migrations

Feature Additions (38)
  • add_admin_support.sql
  • add_availability_slots.sql
  • ...
```

**What this means**: The script found 56 migration files organized by category.

---

```
============================================================
APPLIED MIGRATIONS CHECK
============================================================
⚠️  Migrations table does not exist
   This project may not use formal migration tracking.
   Will verify database state by checking actual schema.
```

**What this means**: Your project doesn't use a formal `migrations` table to track applied migrations. This is normal for many projects. The script will verify the actual database schema instead.

---

```
============================================================
SCHEMA VERIFICATION
============================================================

Checking Critical Tables
  ✓ users
  ✓ partners
  ✓ organizations
  ✓ auth_credentials
  ✓ questionnaires
  ✓ therapy_sessions
  ✓ appointments

Checking Critical Columns
  ✓ partners.partner_id
  ✓ partners.email_verified
  ✓ questionnaires.color_coding_scheme
  ✓ therapy_sessions.session_title
```

**What this means**: All critical tables and columns exist in your database. The ✓ indicates the schema is complete.

---

```
============================================================
FINAL ASSESSMENT
============================================================
🎉 DATABASE SCHEMA IS COMPLETE!
   • All 7 critical tables exist
   • All 4 critical columns exist
   • No formal migration tracking detected (this is normal for this project)
```

**What this means**: Your database is up to date! The schema contains all the necessary tables and columns.

### Possible Scenarios

#### Scenario 1: Database is Fully Up to Date ✅
```
🎉 DATABASE SCHEMA IS COMPLETE!
   • All 7 critical tables exist
   • All 4 critical columns exist
   • No formal migration tracking detected (this is normal for this project)
```

**Action**: No action needed. Your production database matches your local database.

---

#### Scenario 2: Missing Migrations ❌
```
❌ DATABASE IS NOT UP TO DATE
   • Missing 3 migrations
   • Schema completeness: 5/7 tables

❌ MISSING MIGRATIONS - NEED TO APPLY
  • add_partner_fee_fields.sql
  • add_questionnaire_sharing.sql
  • add_timezone_support.sql
```

**Action**: Apply the missing migrations to your production database:

```bash
# Connect to production database and run each missing migration
psql -U postgres -d therapy_tracker_production -f backend/database/migrations/add_partner_fee_fields.sql
psql -U postgres -d therapy_tracker_production -f backend/database/migrations/add_questionnaire_sharing.sql
psql -U postgres -d therapy_tracker_production -f backend/database/migrations/add_timezone_support.sql
```

---

#### Scenario 3: Schema Incomplete but No Migration Tracking
```
❌ DATABASE SCHEMA IS INCOMPLETE
   • Tables: 5/7 tables
   • Columns: 2/4 columns

NEXT STEPS
Your database appears to be missing some tables/columns.
Consider running the complete schema setup:
  psql -U postgres -d your_db -f backend/database/migrations/01_create_all_tables.sql
```

**Action**: Run the complete schema setup or identify which specific migrations are needed.

---

#### Scenario 4: Extra Migrations Detected ⚠️
```
⚠️  EXTRA MIGRATIONS (in database but not in files)
  • add_custom_feature.sql (applied: 1/15/2024, 10:30:00 AM)
```

**What this means**: Migrations were applied to production but the migration files don't exist in your current codebase. This could indicate:
- Missing files in your repository
- Migrations applied from a different branch
- Manual database changes

**Action**: Investigate the missing migration files and sync them with your codebase.

## Comparing Local vs Production

To verify that your production database matches your local database:

1. **Run verification on local:**
   ```bash
   node verify-migrations.js local > local-check.txt
   ```

2. **Run verification on production:**
   ```bash
   node verify-migrations.js production > production-check.txt
   ```

3. **Compare the results:**
   ```bash
   diff local-check.txt production-check.txt
   ```

Or manually compare the "FINAL ASSESSMENT" sections from both runs.

## Troubleshooting

### Connection Errors

**Error**: `Database password not found for environment: production`

**Solution**: Make sure your `.env.production` file exists and contains:
```
DATABASE_URL=postgresql://username:password@host:5432/database
```

---

**Error**: `connect ECONNREFUSED`

**Solution**: Check that:
- Your PostgreSQL server is running
- The host and port are correct
- Network/firewall rules allow connections
- For production, you may need SSL: `?sslmode=require` at the end of your DATABASE_URL

---

**Error**: `password authentication failed`

**Solution**: Verify your username and password are correct in the environment file.

### Schema Issues

**Problem**: Tables exist but columns are missing

**Solution**: This usually means a migration partially failed. Check the specific migration file and run it manually:
```bash
psql -U postgres -d your_db -f backend/database/migrations/specific_migration.sql
```

---

**Problem**: Migration tracking table doesn't exist

**Solution**: This is normal for this project. The script will verify the actual schema instead of relying on migration tracking.

## Best Practices

1. **Always backup before running migrations** in production
2. **Test migrations on staging first** before applying to production
3. **Run verification after deployments** to ensure migrations applied successfully
4. **Keep migration files in version control** to track schema changes
5. **Document manual database changes** if you must make them

## Script Options

The verification script supports different ways to specify the database:

```bash
# Using environment name
node verify-migrations.js local
node verify-migrations.js production

# Using direct connection string
node verify-migrations.js postgres://user:pass@localhost:5432/dbname

# Using environment variables
DATABASE_URL="postgres://..." node verify-migrations.js
```

## Exit Codes

- `0` - Success (database is up to date)
- `1` - Failure (database is missing migrations or schema is incomplete)

This can be used in CI/CD pipelines:
```bash
node verify-migrations.js production || echo "Database verification failed!"