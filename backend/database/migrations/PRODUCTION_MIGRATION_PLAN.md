# Production Database Migration Plan

This document outlines the plan to create all 18 tables in the production database in the correct sequence, respecting foreign key dependencies.

## Table Creation Order

The tables must be created in the following order to satisfy foreign key constraints:

### Phase 1: Base Tables (No Dependencies)
1. **admins** - Admin user information
2. **organizations** - Therapy organizations (optional FK to admins)
3. **users** - Patient/client information
4. **auth_credentials** - Authentication data (references by ID only, no FK)

### Phase 2: Dependent Base Tables
5. **partners** - Therapists (depends on: organizations)
6. **password_reset_tokens** - Password reset functionality (depends on: auth_credentials via email)

### Phase 3: Appointment & Session Tables
7. **appointments** - Partner appointments (depends on: partners, users)
8. **video_sessions** - Video conferencing sessions (depends on: partners, users)

### Phase 4: Questionnaire System
9. **questionnaires** - Questionnaire templates (depends on: partners)
10. **questionnaire_questions** - Questions for questionnaires (depends on: questionnaires)
11. **questionnaire_answer_options** - Answer options for questions (depends on: questionnaire_questions)

### Phase 5: Assignment & Relationship Tables
12. **user_partner_assignments** - User-partner relationships (depends on: users, partners)
13. **user_questionnaire_assignments** - Questionnaire assignments (depends on: questionnaires, users, partners)

### Phase 6: Therapy Sessions
14. **therapy_sessions** - Therapy session records (depends on: appointments, partners, users, video_sessions)

### Phase 7: Response & Linking Tables
15. **user_questionnaire_responses** - User questionnaire responses (depends on: user_questionnaire_assignments, questionnaire_questions, questionnaire_answer_options, therapy_sessions)
16. **user_questionnaire_text_responses** - Text responses for questionnaires (depends on: user_questionnaire_assignments)
17. **session_questionnaire_assignments** - Links sessions to questionnaire assignments (depends on: therapy_sessions, user_questionnaire_assignments)

### Phase 8: Chart Sharing
18. **shared_charts** - Shared charts with clients (depends on: partners, users, questionnaires)

## Execution Instructions

### Option 1: Single File Execution (Recommended)
Execute the complete migration file:
```bash
psql -U postgres -d your_database_name -f backend/database/migrations/01_create_all_tables.sql
```

### Option 2: Sequential Execution
If you prefer to execute in phases, use the numbered files:
```bash
psql -U postgres -d your_database_name -f backend/database/migrations/01_phase1_base_tables.sql
psql -U postgres -d your_database_name -f backend/database/migrations/02_phase2_dependent_base.sql
psql -U postgres -d your_database_name -f backend/database/migrations/03_phase3_appointments_sessions.sql
psql -U postgres -d your_database_name -f backend/database/migrations/04_phase4_questionnaires.sql
psql -U postgres -d your_database_name -f backend/database/migrations/05_phase5_assignments.sql
psql -U postgres -d your_database_name -f backend/database/migrations/06_phase6_therapy_sessions.sql
psql -U postgres -d your_database_name -f backend/database/migrations/07_phase7_responses.sql
psql -U postgres -d your_database_name -f backend/database/migrations/08_phase8_charts.sql
```

## Verification

After execution, verify all tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see all 18 tables listed.

## Important Notes

1. **Foreign Key Constraints**: All foreign keys are created with appropriate CASCADE or SET NULL behavior
2. **Indexes**: All necessary indexes are created for performance
3. **Constraints**: All CHECK constraints and UNIQUE constraints are included
4. **Triggers**: The `update_questionnaires_updated_at` trigger function is created
5. **Comments**: All tables and important columns have documentation comments

## Rollback

If you need to rollback, you can drop all tables (in reverse order) or use:
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

**WARNING**: This will delete all data. Only use in development or when you have backups.









