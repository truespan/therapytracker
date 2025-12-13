# Database Migrations

This directory contains SQL migration files for database schema updates.

## Running Migrations

### Option 1: Using psql command line

```bash
# Connect to your database and run the migration
psql -U postgres -d therapy_tracker -f migrations/001_add_contact_submissions.sql
```

### Option 2: Using psql interactive mode

```bash
# Connect to database
psql -U postgres -d therapy_tracker

# Then run:
\i migrations/001_add_contact_submissions.sql
```

### Option 3: From project root

```bash
# From the backend directory
cd backend
psql -U postgres -d therapy_tracker -f database/migrations/001_add_contact_submissions.sql
```

## Migration Files

- `001_add_contact_submissions.sql` - Adds contact_submissions table for storing contact form data

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` to be safe for re-running
- Always backup your database before running migrations in production
- Test migrations on a development/staging database first

