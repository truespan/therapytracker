-- Migration: Add event fields to blogs table
-- This migration adds support for event management features:
-- - event_date: Date of the event
-- - event_time: Time of the event
-- - fee: Fee amount for the event
-- - event_type: Type of event (Online/Offline)
--
-- This converts the blogs table to support event management functionality
-- while maintaining backward compatibility with existing blog posts.

-- Add event_date column (nullable, for events)
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS event_date DATE;

-- Add event_time column (nullable, for events)
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS event_time TIME;

-- Add fee column (nullable, for paid events)
-- Using DECIMAL(10, 2) to support up to 99,999,999.99
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS fee DECIMAL(10, 2);

-- Add event_type column (nullable, defaults to 'Online' for new events)
-- Using VARCHAR(10) to store 'Online' or 'Offline'
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(10) DEFAULT 'Online';

-- Add check constraint to ensure event_type is either 'Online' or 'Offline'
ALTER TABLE blogs 
DROP CONSTRAINT IF EXISTS blogs_event_type_check;

ALTER TABLE blogs 
ADD CONSTRAINT blogs_event_type_check 
CHECK (event_type IS NULL OR event_type IN ('Online', 'Offline'));

-- Add indexes for better query performance on event fields
CREATE INDEX IF NOT EXISTS idx_blogs_event_date ON blogs(event_date);
CREATE INDEX IF NOT EXISTS idx_blogs_event_type ON blogs(event_type);

-- Add comments to document the new columns
COMMENT ON COLUMN blogs.event_date IS 'Date of the event (for event-type blogs)';
COMMENT ON COLUMN blogs.event_time IS 'Time of the event (for event-type blogs)';
COMMENT ON COLUMN blogs.fee IS 'Fee amount for the event in decimal format';
COMMENT ON COLUMN blogs.event_type IS 'Type of event: Online or Offline';

-- Note: 
-- - All new columns are nullable to maintain backward compatibility with existing blog posts
-- - Existing blogs will have NULL values for these fields, which is acceptable
-- - The event_type has a default value of 'Online' but this only applies to new rows
--   For existing NULL values, they remain NULL unless explicitly set
