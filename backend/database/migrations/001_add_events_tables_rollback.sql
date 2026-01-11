-- Rollback Migration: Remove Events and Event Enrollments Tables
-- Description: Removes events functionality (run this to undo 001_add_events_tables.sql)
-- Date: 2024

-- Drop indexes first (they depend on tables)
DROP INDEX IF EXISTS idx_event_enrollments_status;
DROP INDEX IF EXISTS idx_event_enrollments_user;
DROP INDEX IF EXISTS idx_event_enrollments_event;
DROP INDEX IF EXISTS idx_events_event_date;
DROP INDEX IF EXISTS idx_events_partner;

-- Drop tables (event_enrollments must be dropped first due to foreign key constraint)
DROP TABLE IF EXISTS event_enrollments CASCADE;
DROP TABLE IF EXISTS events CASCADE;
