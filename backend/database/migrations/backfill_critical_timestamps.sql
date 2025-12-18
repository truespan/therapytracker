-- ============================================================================
-- PHASE 2: BACKFILL DATA FROM TIMESTAMP TO TIMESTAMPTZ
-- ============================================================================
-- Purpose: Copy data from old TIMESTAMP columns to new TIMESTAMPTZ columns
-- Strategy: Batch processing to avoid long-running transactions and locks
-- Data conversion: Treat existing TIMESTAMP values as UTC
--
-- IMPORTANT: Run this AFTER Phase 1 (adding new columns)
-- This script processes data in batches to maintain zero downtime
-- ============================================================================

-- Set timezone to UTC for this session
SET timezone = 'UTC';

-- ============================================================================
-- Table 1: appointments
-- ============================================================================

DO $$
DECLARE
    batch_size INTEGER := 1000;
    rows_updated INTEGER;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting backfill for appointments table...';

    LOOP
        -- Update in batches
        UPDATE appointments
        SET
            appointment_date_tz = appointment_date AT TIME ZONE 'UTC',
            end_date_tz = end_date AT TIME ZONE 'UTC',
            created_at_tz = created_at AT TIME ZONE 'UTC',
            updated_at_tz = COALESCE(updated_at, created_at) AT TIME ZONE 'UTC'
        WHERE id IN (
            SELECT id
            FROM appointments
            WHERE appointment_date_tz IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        total_updated := total_updated + rows_updated;

        RAISE NOTICE 'Appointments: Updated % rows (total: %)', rows_updated, total_updated;

        -- Exit loop when no more rows to update
        EXIT WHEN rows_updated = 0;

        -- Small delay to avoid overloading database
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Appointments backfill complete: % total rows updated', total_updated;
END
$$;

-- ============================================================================
-- Table 2: availability_slots
-- ============================================================================

DO $$
DECLARE
    batch_size INTEGER := 1000;
    rows_updated INTEGER;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting backfill for availability_slots table...';

    LOOP
        UPDATE availability_slots
        SET
            start_datetime_tz = start_datetime AT TIME ZONE 'UTC',
            end_datetime_tz = end_datetime AT TIME ZONE 'UTC',
            booked_at_tz = booked_at AT TIME ZONE 'UTC',
            last_published_at_tz = last_published_at AT TIME ZONE 'UTC',
            created_at_tz = created_at AT TIME ZONE 'UTC',
            updated_at_tz = COALESCE(updated_at, created_at) AT TIME ZONE 'UTC',
            archived_at_tz = archived_at AT TIME ZONE 'UTC'
        WHERE id IN (
            SELECT id
            FROM availability_slots
            WHERE start_datetime_tz IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        total_updated := total_updated + rows_updated;

        RAISE NOTICE 'Availability_slots: Updated % rows (total: %)', rows_updated, total_updated;

        EXIT WHEN rows_updated = 0;

        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Availability_slots backfill complete: % total rows updated', total_updated;
END
$$;

-- ============================================================================
-- Table 3: video_sessions
-- ============================================================================

DO $$
DECLARE
    batch_size INTEGER := 1000;
    rows_updated INTEGER;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting backfill for video_sessions table...';

    LOOP
        UPDATE video_sessions
        SET
            session_date_tz = session_date AT TIME ZONE 'UTC',
            end_date_tz = end_date AT TIME ZONE 'UTC',
            created_at_tz = created_at AT TIME ZONE 'UTC',
            updated_at_tz = COALESCE(updated_at, created_at) AT TIME ZONE 'UTC'
        WHERE id IN (
            SELECT id
            FROM video_sessions
            WHERE session_date_tz IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        total_updated := total_updated + rows_updated;

        RAISE NOTICE 'Video_sessions: Updated % rows (total: %)', rows_updated, total_updated;

        EXIT WHEN rows_updated = 0;

        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Video_sessions backfill complete: % total rows updated', total_updated;
END
$$;

-- ============================================================================
-- Table 4: therapy_sessions
-- ============================================================================

DO $$
DECLARE
    batch_size INTEGER := 1000;
    rows_updated INTEGER;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting backfill for therapy_sessions table...';

    LOOP
        UPDATE therapy_sessions
        SET
            session_date_tz = session_date AT TIME ZONE 'UTC',
            created_at_tz = created_at AT TIME ZONE 'UTC',
            updated_at_tz = COALESCE(updated_at, created_at) AT TIME ZONE 'UTC'
        WHERE id IN (
            SELECT id
            FROM therapy_sessions
            WHERE session_date_tz IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        total_updated := total_updated + rows_updated;

        RAISE NOTICE 'Therapy_sessions: Updated % rows (total: %)', rows_updated, total_updated;

        EXIT WHEN rows_updated = 0;

        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Therapy_sessions backfill complete: % total rows updated', total_updated;
END
$$;

-- ============================================================================
-- PHASE 2 VERIFICATION
-- ============================================================================

DO $$
DECLARE
    app_remaining INTEGER;
    avail_remaining INTEGER;
    video_remaining INTEGER;
    therapy_remaining INTEGER;
BEGIN
    -- Check for any remaining NULL values
    SELECT COUNT(*) INTO app_remaining
    FROM appointments
    WHERE appointment_date_tz IS NULL;

    SELECT COUNT(*) INTO avail_remaining
    FROM availability_slots
    WHERE start_datetime_tz IS NULL;

    SELECT COUNT(*) INTO video_remaining
    FROM video_sessions
    WHERE session_date_tz IS NULL;

    SELECT COUNT(*) INTO therapy_remaining
    FROM therapy_sessions
    WHERE session_date_tz IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'BACKFILL VERIFICATION:';
    RAISE NOTICE 'Appointments remaining: %', app_remaining;
    RAISE NOTICE 'Availability_slots remaining: %', avail_remaining;
    RAISE NOTICE 'Video_sessions remaining: %', video_remaining;
    RAISE NOTICE 'Therapy_sessions remaining: %', therapy_remaining;

    IF app_remaining = 0 AND avail_remaining = 0 AND video_remaining = 0 AND therapy_remaining = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE 'SUCCESS: All data backfilled successfully!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next step: Run Phase 3 script to add NOT NULL constraints';
    ELSE
        RAISE WARNING 'Some rows still need backfilling. Re-run this script or investigate data issues.';
    END IF;

    RAISE NOTICE '========================================';
END
$$;
