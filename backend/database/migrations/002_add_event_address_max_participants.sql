-- Migration: Add Address and Maximum Participants to Events Table
-- Description: Adds address field for offline events and max_participants for event capacity
-- Date: 2024

-- Add address column to events table (for offline events)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add max_participants column to events table (NULL means unlimited)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0);

-- Add comments for documentation
COMMENT ON COLUMN events.address IS 'Physical address for offline events';
COMMENT ON COLUMN events.max_participants IS 'Maximum number of participants allowed (NULL means unlimited)';
