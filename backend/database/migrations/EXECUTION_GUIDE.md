# Production Database Migration - Quick Execution Guide

## Quick Start

### Prerequisites
- PostgreSQL database server running
- Database created (e.g., `therapy_tracker`)
- Appropriate database user credentials

### Single Command Execution

Execute the complete migration in one command:

```bash
psql -U postgres -d therapy_tracker -f backend/database/migrations/01_create_all_tables.sql
```

**Replace:**
- `postgres` with your database username
- `therapy_tracker` with your database name
- Adjust the file path if needed

### Windows PowerShell Example

```powershell
psql -U postgres -d therapy_tracker -f backend\database\migrations\01_create_all_tables.sql
```

### Verification

After execution, verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output (18 tables):
- admins
- appointments
- auth_credentials
- organizations
- partners
- password_reset_tokens
- questionnaire_answer_options
- questionnaire_questions
- questionnaires
- session_questionnaire_assignments
- shared_charts
- therapy_sessions
- user_partner_assignments
- user_questionnaire_assignments
- user_questionnaire_responses
- user_questionnaire_text_responses
- users
- video_sessions

## Troubleshooting

### Error: "relation already exists"
If a table already exists, the script uses `CREATE TABLE IF NOT EXISTS`, so this should not occur. If it does, you may need to drop existing tables first (see rollback section).

### Error: "permission denied"
Ensure your database user has CREATE TABLE permissions:
```sql
GRANT CREATE ON DATABASE therapy_tracker TO your_username;
```

### Error: "foreign key constraint"
This should not occur if executing the complete file in order. If it does, check that all previous tables were created successfully.

## Rollback (Development Only)

**WARNING**: This will delete all data. Only use in development or when you have backups.

```sql
DROP TABLE IF EXISTS 
  session_questionnaire_assignments,
  user_questionnaire_text_responses,
  user_questionnaire_responses,
  therapy_sessions,
  user_questionnaire_assignments,
  user_partner_assignments,
  questionnaire_answer_options,
  questionnaire_questions,
  questionnaires,
  video_sessions,
  appointments,
  password_reset_tokens,
  partners,
  auth_credentials,
  users,
  organizations,
  admins,
  shared_charts
CASCADE;
```

## Next Steps

After successful migration:
1. Verify all tables exist (use verification query above)
2. Check foreign key constraints are in place
3. Verify indexes were created
4. Test your application connection

## Support

For detailed information, see `PRODUCTION_MIGRATION_PLAN.md`


















