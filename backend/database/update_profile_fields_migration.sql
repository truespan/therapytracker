-- Migration Script: Update Profile Fields Table
-- This script updates existing databases to use the new profile fields structure
-- Run this script on existing databases to migrate to the new schema

-- Step 1: Drop the old CHECK constraint on category column FIRST
ALTER TABLE profile_fields DROP CONSTRAINT IF EXISTS profile_fields_category_check;

-- Step 2: Delete all existing records from profile_fields table
-- Note: This will cascade delete related user_profiles records due to ON DELETE CASCADE
DELETE FROM profile_fields;

-- Step 3: Add the new CHECK constraint with updated categories
ALTER TABLE profile_fields 
ADD CONSTRAINT profile_fields_category_check 
CHECK (category IN ('Emotional Well-being', 'Social & Relationships', 'Physical Health', 'Daily Functioning', 'Self-Care & Coping', 'Others'));

-- Step 4: Insert the new default profile fields
-- Rating scale: "Excellent", "Good", "Fair", "Poor", "Very Poor"
INSERT INTO profile_fields (field_name, field_type, category, is_default) VALUES
('How would you rate your overall mood this week?', 'rating_5', 'Emotional Well-being', TRUE),
('How would you rate your current relationships with family and friends?', 'rating_5', 'Social & Relationships', TRUE),
('How would you rate your overall physical health?', 'rating_5', 'Physical Health', TRUE),
('How would you rate your sleep quality?', 'rating_5', 'Daily Functioning', TRUE),
('How well are you practicing self-care activities?', 'rating_5', 'Self-Care & Coping', TRUE),
('Are you getting disturbing dreams repeatedly?', 'rating_5', 'Others', TRUE);

-- Verify the migration
SELECT * FROM profile_fields ORDER BY id;
