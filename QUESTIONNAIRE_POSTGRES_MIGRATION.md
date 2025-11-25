# Custom Questionnaire System - PostgreSQL Migration Guide

## Issue Resolved

The original migration file was written for MySQL. Your system uses **PostgreSQL**, which has different syntax. This has been fixed.

## What Changed

### Key Differences Between MySQL and PostgreSQL:

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| Auto Increment | `AUTO_INCREMENT` | `SERIAL` |
| Parameter Placeholders | `?` | `$1, $2, $3` |
| Result Access | `result.insertId` | `result.rows[0].id` |
| Row Count | `result.affectedRows` | `result.rowCount` |
| Enum Type | `ENUM('a','b')` | `VARCHAR(20) CHECK (col IN ('a','b'))` |
| Table Comments | `COMMENT = 'text'` | `COMMENT ON TABLE ... IS 'text'` |
| Update Timestamp | `ON UPDATE CURRENT_TIMESTAMP` | Trigger function |
| Query Method | `db.execute()` | `db.query()` |

## Files Updated

### 1. New Migration File (PostgreSQL)
✅ **Created:** `backend/database/migrations/add_custom_questionnaires_postgres.sql`

This file contains the correct PostgreSQL syntax for:
- `SERIAL` instead of `AUTO_INCREMENT`
- Proper CHECK constraints instead of ENUM
- `COMMENT ON TABLE` syntax
- Trigger function for `updated_at` timestamp

### 2. Updated Models
✅ **Updated:** `backend/src/models/Questionnaire.js`
✅ **Updated:** `backend/src/models/QuestionnaireAssignment.js`

Changes made:
- Changed `db.execute()` to `db.query()`
- Changed `?` placeholders to `$1, $2, $3`
- Changed `result.insertId` to `result.rows[0].id`
- Changed `result.affectedRows` to `result.rowCount`
- Changed `[rows]` destructuring to `result.rows`
- Updated transaction handling to use `db.pool.connect()`

## Migration Instructions

### Step 1: Apply the PostgreSQL Migration

```bash
# Option 1: Using psql command line
psql -U your_username -d your_database_name -f backend/database/migrations/add_custom_questionnaires_postgres.sql

# Option 2: Using psql interactive
psql -U your_username -d your_database_name
\i backend/database/migrations/add_custom_questionnaires_postgres.sql
\q

# Option 3: Using connection string
psql postgresql://username:password@host:port/database -f backend/database/migrations/add_custom_questionnaires_postgres.sql
```

### Step 2: Verify Tables Created

```sql
-- Connect to your database
psql -U your_username -d your_database_name

-- List all tables
\dt

-- Check questionnaire tables specifically
\dt *questionnaire*

-- View table structure
\d questionnaires
\d questionnaire_questions
\d questionnaire_answer_options
\d user_questionnaire_assignments
\d user_questionnaire_responses

-- Check indexes
\di *questionnaire*

-- Check foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name LIKE '%questionnaire%';
```

Expected output:
```
questionnaires
questionnaire_questions
questionnaire_answer_options
user_questionnaire_assignments
user_questionnaire_responses
```

### Step 3: Restart Backend Server

```bash
cd backend
npm start
```

You should see:
```
Connected to PostgreSQL database
Server running on port 5000
```

### Step 4: Test the System

```bash
# Test creating a questionnaire
curl -X POST http://localhost:5000/api/questionnaires \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Questionnaire",
    "description": "Testing PostgreSQL",
    "questions": [
      {
        "question_text": "How are you?",
        "options": [
          {"option_text": "Good", "option_value": 1},
          {"option_text": "Bad", "option_value": 2}
        ]
      }
    ]
  }'
```

## Troubleshooting

### Error: "relation 'partners' does not exist"

This means the `partners` table doesn't exist. The questionnaires system depends on existing tables:
- `partners`
- `users`
- `sessions`

Make sure these tables exist before running the questionnaire migration.

### Error: "permission denied"

Your PostgreSQL user needs permissions to create tables:

```sql
-- Grant permissions (run as superuser)
GRANT CREATE ON DATABASE your_database TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### Error: "database connection failed"

Check your `.env` file has the correct `DATABASE_URL`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### Error: "syntax error near 'AUTO_INCREMENT'"

You're still using the MySQL migration file. Make sure to use:
```bash
backend/database/migrations/add_custom_questionnaires_postgres.sql
```

NOT:
```bash
backend/database/migrations/add_custom_questionnaires.sql
```

## Verification Queries

### Check if migration was successful:

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name LIKE '%questionnaire%';
-- Expected: 5

-- Count indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename LIKE '%questionnaire%';
-- Expected: 14

-- Check trigger exists
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE '%questionnaire%';
-- Expected: trigger_update_questionnaires_updated_at

-- Test insert
INSERT INTO questionnaires (partner_id, name, description) 
VALUES (1, 'Test', 'Testing') 
RETURNING id;
-- Should return an ID

-- Clean up test
DELETE FROM questionnaires WHERE name = 'Test';
```

## Database Backup (Recommended)

Before running the migration, backup your database:

```bash
# Full database backup
pg_dump -U your_username -d your_database_name -F c -f backup_before_questionnaire.dump

# Schema only backup
pg_dump -U your_username -d your_database_name --schema-only -f backup_schema.sql

# Restore if needed
pg_restore -U your_username -d your_database_name backup_before_questionnaire.dump
```

## Rollback Instructions

If you need to remove the questionnaire tables:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS user_questionnaire_responses CASCADE;
DROP TABLE IF EXISTS user_questionnaire_assignments CASCADE;
DROP TABLE IF EXISTS questionnaire_answer_options CASCADE;
DROP TABLE IF EXISTS questionnaire_questions CASCADE;
DROP TABLE IF EXISTS questionnaires CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_questionnaires_updated_at() CASCADE;
```

## Performance Tuning (Optional)

After migration, analyze tables for better performance:

```sql
-- Analyze tables for query planner
ANALYZE questionnaires;
ANALYZE questionnaire_questions;
ANALYZE questionnaire_answer_options;
ANALYZE user_questionnaire_assignments;
ANALYZE user_questionnaire_responses;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE '%questionnaire%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Summary

✅ **PostgreSQL migration file created**
✅ **Models updated for PostgreSQL syntax**
✅ **All queries converted from MySQL to PostgreSQL**
✅ **Transaction handling updated**
✅ **Ready to deploy**

## Next Steps

1. ✅ Apply migration: `psql -U user -d db -f add_custom_questionnaires_postgres.sql`
2. ✅ Verify tables: `\dt *questionnaire*`
3. ✅ Restart backend: `npm start`
4. ✅ Test in browser: Login and go to Questionnaires tab
5. ✅ Create test questionnaire
6. ✅ Assign to test user
7. ✅ Complete as user
8. ✅ View charts

## Support

If you encounter any issues:
1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Check backend logs: Look for SQL errors in console
3. Verify DATABASE_URL in `.env`
4. Ensure all prerequisite tables exist (partners, users, sessions)
5. Check PostgreSQL version: `psql --version` (should be 9.5+)

The system is now fully compatible with PostgreSQL! 🎉








