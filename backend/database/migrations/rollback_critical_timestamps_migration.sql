-- ============================================================================
-- ROLLBACK SCRIPT: TIMESTAMP → TIMESTAMPTZ Migration
-- ============================================================================
-- Purpose: Revert the migration if issues occur
-- Use this script if you need to rollback the migration before Phase 6 (drop columns)
--
-- WARNING: Only use this if the migration has issues
-- After Phase 6 (dropping old columns), this rollback is no longer possible
-- ============================================================================

SET timezone = 'UTC';

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STARTING ROLLBACK OF TIMESTAMP MIGRATION';
    RAISE NOTICE 'This will remove the new *_tz columns';
    RAISE NOTICE '========================================';
END
$$;

-- ============================================================================
-- Rollback Table 1: appointments
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back appointments table...';

    -- Drop new TIMESTAMPTZ columns
    ALTER TABLE appointments
      DROP COLUMN IF EXISTS appointment_date_tz,
      DROP COLUMN IF EXISTS end_date_tz,
      DROP COLUMN IF EXISTS created_at_tz,
      DROP COLUMN IF EXISTS updated_at_tz;

    RAISE NOTICE 'Appointments: TIMESTAMPTZ columns removed';
END
$$;

-- ============================================================================
-- Rollback Table 2: availability_slots
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back availability_slots table...';

    ALTER TABLE availability_slots
      DROP COLUMN IF EXISTS start_datetime_tz,
      DROP COLUMN IF EXISTS end_datetime_tz,
      DROP COLUMN IF EXISTS booked_at_tz,
      DROP COLUMN IF EXISTS last_published_at_tz,
      DROP COLUMN IF EXISTS created_at_tz,
      DROP COLUMN IF EXISTS updated_at_tz,
      DROP COLUMN IF EXISTS archived_at_tz;

    RAISE NOTICE 'Availability_slots: TIMESTAMPTZ columns removed';
END
$$;

-- ============================================================================
-- Rollback Table 3: video_sessions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back video_sessions table...';

    ALTER TABLE video_sessions
      DROP COLUMN IF EXISTS session_date_tz,
      DROP COLUMN IF EXISTS end_date_tz,
      DROP COLUMN IF EXISTS created_at_tz,
      DROP COLUMN IF EXISTS updated_at_tz;

    RAISE NOTICE 'Video_sessions: TIMESTAMPTZ columns removed';
END
$$;

-- ============================================================================
-- Rollback Table 4: therapy_sessions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Rolling back therapy_sessions table...';

    ALTER TABLE therapy_sessions
      DROP COLUMN IF EXISTS session_date_tz,
      DROP COLUMN IF EXISTS created_at_tz,
      DROP COLUMN IF EXISTS updated_at_tz;

    RAISE NOTICE 'Therapy_sessions: TIMESTAMPTZ columns removed';
END
$$;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK COMPLETE';
    RAISE NOTICE 'All new TIMESTAMPTZ columns have been removed';
    RAISE NOTICE 'Original TIMESTAMP columns remain intact';
    RAISE NOTICE '========================================';
END
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify no *_tz columns remain
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('appointments', 'availability_slots', 'video_sessions', 'therapy_sessions')
  AND column_name LIKE '%_tz'
ORDER BY table_name, ordinal_position;

-- This query should return 0 rows if rollback was successful
