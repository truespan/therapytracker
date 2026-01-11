-- Rollback Migration: Remove event fields from blogs table
-- This migration removes the event-related columns added in migration_add_event_fields_to_blogs.sql
-- WARNING: This will permanently delete data in these columns. Use with caution.

-- Drop indexes first
DROP INDEX IF EXISTS idx_blogs_event_type;
DROP INDEX IF EXISTS idx_blogs_event_date;

-- Drop check constraint
ALTER TABLE blogs 
DROP CONSTRAINT IF EXISTS blogs_event_type_check;

-- Remove columns (this will delete all data in these columns)
ALTER TABLE blogs 
DROP COLUMN IF EXISTS event_type;

ALTER TABLE blogs 
DROP COLUMN IF EXISTS fee;

ALTER TABLE blogs 
DROP COLUMN IF EXISTS event_time;

ALTER TABLE blogs 
DROP COLUMN IF EXISTS event_date;

-- Note: 
-- - This migration will permanently remove all event data
-- - Ensure you have a backup before running this rollback
-- - After running this, the blogs table will revert to its original structure
