-- Migration: Add session_number column to therapy_sessions table
-- Description: Adds session_number column to track persistent session numbers per user-partner pair
-- Date: 2025-01-27

-- Add session_number column (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'therapy_sessions' 
        AND column_name = 'session_number'
    ) THEN
        ALTER TABLE therapy_sessions ADD COLUMN session_number INTEGER;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_session_number ON therapy_sessions(user_id, partner_id, session_number);

-- Add comment for documentation
COMMENT ON COLUMN therapy_sessions.session_number IS 'Sequential session number for this user-partner pair (1, 2, 3, etc.)';

-- Backfill existing sessions with session numbers based on creation order
-- This assigns session numbers to existing sessions based on their created_at timestamp
DO $$
DECLARE
    user_partner_rec RECORD;
    session_rec RECORD;
    session_num INTEGER;
BEGIN
    -- For each user-partner pair, assign session numbers based on creation order
    FOR user_partner_rec IN 
        SELECT DISTINCT user_id, partner_id 
        FROM therapy_sessions 
        WHERE session_number IS NULL
    LOOP
        session_num := 1;
        -- Update sessions for this user-partner pair, ordered by created_at
        FOR session_rec IN 
            SELECT id 
            FROM therapy_sessions 
            WHERE user_id = user_partner_rec.user_id 
              AND partner_id = user_partner_rec.partner_id
              AND session_number IS NULL
            ORDER BY created_at ASC
        LOOP
            UPDATE therapy_sessions 
            SET session_number = session_num 
            WHERE id = session_rec.id;
            session_num := session_num + 1;
        END LOOP;
    END LOOP;
END $$;

-- Make session_number NOT NULL after backfilling (only if all rows have been backfilled)
DO $$
BEGIN
    -- Only set NOT NULL if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM therapy_sessions WHERE session_number IS NULL) THEN
        ALTER TABLE therapy_sessions ALTER COLUMN session_number SET NOT NULL;
    END IF;
END $$;

