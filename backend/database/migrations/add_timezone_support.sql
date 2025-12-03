-- ============================================================================
-- Add Timezone Support to Appointments and Video Sessions
-- ============================================================================
-- This migration adds timezone columns to appointments and video_sessions tables
-- to properly handle timezone conversions between UTC storage and local display
--
-- Execute: psql -U postgres -d your_database_name -f add_timezone_support.sql
-- ============================================================================

-- Add timezone column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Add timezone column to video_sessions table
ALTER TABLE video_sessions
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Add comments
COMMENT ON COLUMN appointments.timezone IS 'IANA timezone identifier for the user who created the appointment (e.g., America/New_York, Asia/Kolkata)';
COMMENT ON COLUMN video_sessions.timezone IS 'IANA timezone identifier for the user who created the video session (e.g., America/New_York, Asia/Kolkata)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_timezone ON appointments(timezone);
CREATE INDEX IF NOT EXISTS idx_video_sessions_timezone ON video_sessions(timezone);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Timezone columns added to appointments and video_sessions tables';
    RAISE NOTICE 'All dates are now stored in UTC with timezone information preserved';
END
$$;
