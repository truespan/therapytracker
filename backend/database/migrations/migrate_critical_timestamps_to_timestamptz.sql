-- ============================================================================
-- CRITICAL TIMESTAMPS MIGRATION: TIMESTAMP → TIMESTAMPTZ
-- ============================================================================
-- Purpose: Convert critical scheduling tables to use TIMESTAMPTZ (timezone-aware)
-- Scope: Phase 1 - availability_slots, appointments, video_sessions, therapy_sessions
-- Strategy: Zero-downtime migration with phased approach
--
-- IMPORTANT: This script should be run in phases:
--   Phase 1: Add new columns (this script)
--   Phase 2: Backfill data (separate script/process)
--   Phase 3: Add constraints (after backfill complete)
--   Phase 4-5: Application deployment (dual-write, then switch reads)
--   Phase 6: Drop old columns and rename (after monitoring period)
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD NEW TIMESTAMPTZ COLUMNS
-- ============================================================================
-- These columns will coexist with old TIMESTAMP columns during transition
-- No locks, instant operation

-- Table 1: appointments
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Starting migration for appointments table...';
END
$$;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_date_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at_tz TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN appointments.appointment_date_tz IS 'Appointment start time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN appointments.end_date_tz IS 'Appointment end time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN appointments.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN appointments.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';

DO $$
BEGIN
    RAISE NOTICE 'Appointments table: New TIMESTAMPTZ columns added';
END
$$;

-- Table 2: availability_slots
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Starting migration for availability_slots table...';
END
$$;

ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS start_datetime_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_datetime_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booked_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_published_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at_tz TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN availability_slots.start_datetime_tz IS 'Slot start datetime (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.end_datetime_tz IS 'Slot end datetime (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.booked_at_tz IS 'Booking timestamp (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.last_published_at_tz IS 'Last publication timestamp (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN availability_slots.archived_at_tz IS 'Archive timestamp (TIMESTAMPTZ) - Migration column';

DO $$
BEGIN
    RAISE NOTICE 'Availability_slots table: New TIMESTAMPTZ columns added';
END
$$;

-- Table 3: video_sessions
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Starting migration for video_sessions table...';
END
$$;

ALTER TABLE video_sessions
  ADD COLUMN IF NOT EXISTS session_date_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at_tz TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN video_sessions.session_date_tz IS 'Session start time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN video_sessions.end_date_tz IS 'Session end time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN video_sessions.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN video_sessions.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';

DO $$
BEGIN
    RAISE NOTICE 'Video_sessions table: New TIMESTAMPTZ columns added';
END
$$;

-- Table 4: therapy_sessions
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Starting migration for therapy_sessions table...';
END
$$;

ALTER TABLE therapy_sessions
  ADD COLUMN IF NOT EXISTS session_date_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at_tz TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at_tz TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN therapy_sessions.session_date_tz IS 'Session datetime (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN therapy_sessions.created_at_tz IS 'Record creation time (TIMESTAMPTZ) - Migration column';
COMMENT ON COLUMN therapy_sessions.updated_at_tz IS 'Record last update time (TIMESTAMPTZ) - Migration column';

DO $$
BEGIN
    RAISE NOTICE 'Therapy_sessions table: New TIMESTAMPTZ columns added';
END
$$;

-- ============================================================================
-- PHASE 1 COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1 COMPLETE: New TIMESTAMPTZ columns added to all critical tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run backfill script to copy data from TIMESTAMP to TIMESTAMPTZ columns';
    RAISE NOTICE '2. Add NOT NULL constraints after backfill completes';
    RAISE NOTICE '3. Deploy application code that writes to both old and new columns';
    RAISE NOTICE '4. Monitor for 1-2 days';
    RAISE NOTICE '5. Deploy code that reads from new columns';
    RAISE NOTICE '6. After monitoring, drop old columns and rename new ones';
    RAISE NOTICE '========================================';
END
$$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check progress)
-- ============================================================================

-- Check if new columns exist
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'appointments'
--   AND column_name LIKE '%_tz'
-- ORDER BY ordinal_position;

-- Count rows that need backfilling
-- SELECT
--   'appointments' as table_name,
--   COUNT(*) as total_rows,
--   COUNT(appointment_date_tz) as backfilled_rows,
--   COUNT(*) - COUNT(appointment_date_tz) as remaining_rows
-- FROM appointments;
