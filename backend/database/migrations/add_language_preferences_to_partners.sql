-- ============================================================================
-- Migration: Add Language Preferences to Partners Table
-- ============================================================================
-- This migration adds language_preferences column to store languages spoken by therapists
-- This will be displayed to clients as part of the therapist profile
-- ============================================================================

-- Add language_preferences column
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS language_preferences TEXT;

-- Add index for searching by language
CREATE INDEX IF NOT EXISTS idx_partners_language_preferences ON partners USING gin(to_tsvector('english', coalesce(language_preferences, '')));

-- Add comment
COMMENT ON COLUMN partners.language_preferences IS 'Comma-separated list of languages spoken by the therapist (e.g., "English, Hindi, Tamil"). Displayed to clients in the therapist profile.';

-- Migration completed
SELECT 'Language preferences column added to partners table successfully' as message;
