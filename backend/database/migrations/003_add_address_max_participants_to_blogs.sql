-- Migration: Add Address and Maximum Participants to Blogs Table (for events)
-- Description: Adds address field for offline events and max_participants for event capacity in blogs
-- Date: 2024

-- Add address column to blogs table (for offline events)
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add max_participants column to blogs table (NULL means unlimited)
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0);

-- Add comments for documentation
COMMENT ON COLUMN blogs.address IS 'Physical address for offline events';
COMMENT ON COLUMN blogs.max_participants IS 'Maximum number of participants allowed (NULL means unlimited)';
