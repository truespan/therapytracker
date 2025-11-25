-- Migration: Delete all session-based charts from shared_charts table
-- This removes legacy session-based charts (radar_default and comparison types)
-- Only questionnaire_comparison charts will remain

-- Display count of charts to be deleted (for logging purposes)
DO $$
DECLARE
    chart_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO chart_count
    FROM shared_charts
    WHERE chart_type IN ('radar_default', 'comparison');

    RAISE NOTICE 'Deleting % session-based charts...', chart_count;
END $$;

-- Delete all session-based charts
DELETE FROM shared_charts
WHERE chart_type IN ('radar_default', 'comparison');

-- Display final count
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM shared_charts;

    RAISE NOTICE 'Deletion complete. % questionnaire-based charts remain.', remaining_count;
END $$;
