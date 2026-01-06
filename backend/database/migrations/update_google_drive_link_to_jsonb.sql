-- Migration: Update google_drive_link column to JSONB to support multiple links
-- Description: Changes google_drive_link from TEXT to JSONB to store an array of Google Drive links
-- Date: 2025-01-28

-- First, ensure the column exists (for fresh installs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'therapy_sessions' 
        AND column_name = 'google_drive_link'
    ) THEN
        ALTER TABLE therapy_sessions ADD COLUMN google_drive_link JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migrate existing TEXT data to JSONB array format
DO $$
DECLARE
    rec RECORD;
    link_array JSONB;
BEGIN
    -- Check if column is TEXT type (needs migration)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'therapy_sessions' 
        AND column_name = 'google_drive_link'
        AND data_type = 'text'
    ) THEN
        -- Convert existing single links to array format
        FOR rec IN 
            SELECT id, google_drive_link 
            FROM therapy_sessions 
            WHERE google_drive_link IS NOT NULL 
            AND google_drive_link != ''
            AND google_drive_link::text NOT LIKE '[%'  -- Not already JSON
        LOOP
            -- Create array with single link object
            link_array := jsonb_build_array(
                jsonb_build_object('url', rec.google_drive_link, 'label', '')
            );
            
            -- Update the row
            UPDATE therapy_sessions 
            SET google_drive_link = link_array::jsonb
            WHERE id = rec.id;
        END LOOP;
        
        -- Change column type from TEXT to JSONB
        ALTER TABLE therapy_sessions 
        ALTER COLUMN google_drive_link TYPE JSONB 
        USING CASE 
            WHEN google_drive_link IS NULL OR google_drive_link = '' THEN '[]'::jsonb
            WHEN google_drive_link::text LIKE '[%' THEN google_drive_link::jsonb
            ELSE jsonb_build_array(jsonb_build_object('url', google_drive_link, 'label', ''))
        END;
        
        -- Set default value
        ALTER TABLE therapy_sessions 
        ALTER COLUMN google_drive_link SET DEFAULT '[]'::jsonb;
    ELSE
        -- Column exists but might not have default, set it
        ALTER TABLE therapy_sessions 
        ALTER COLUMN google_drive_link SET DEFAULT '[]'::jsonb;
        
        -- Update NULL values to empty array
        UPDATE therapy_sessions 
        SET google_drive_link = '[]'::jsonb 
        WHERE google_drive_link IS NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN therapy_sessions.google_drive_link IS 'JSONB array of Google Drive links. Format: [{"url": "https://...", "label": "optional label"}, ...]';


