-- Assign Free Plan to therapists in TheraPTrack controlled organizations who don't have subscriptions
-- This migration assigns Free Plan only to therapists who were created before subscription plans were implemented
-- Therapists who already have subscriptions will be left unchanged

DO $$
DECLARE
    free_plan_id INTEGER;
    partner_record RECORD;
    assigned_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Get Free Plan ID
    SELECT id INTO free_plan_id
    FROM subscription_plans
    WHERE plan_name = 'Free Plan' AND is_active = TRUE
    LIMIT 1;

    IF free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free Plan not found. Please run the add_free_plan.sql migration first.';
    END IF;

    RAISE NOTICE 'Found Free Plan with ID: %', free_plan_id;

    -- Find all partners in TheraPTrack controlled organizations who don't have subscriptions
    FOR partner_record IN
        SELECT p.id as partner_id, p.name, p.organization_id, o.name as org_name
        FROM partners p
        INNER JOIN organizations o ON p.organization_id = o.id
        WHERE o.theraptrack_controlled = TRUE
          AND NOT EXISTS (
              SELECT 1
              FROM partner_subscriptions ps
              WHERE ps.partner_id = p.id
          )
        ORDER BY p.id
    LOOP
        -- Insert Free Plan subscription for this partner
        INSERT INTO partner_subscriptions (partner_id, subscription_plan_id, billing_period, subscription_start_date, payment_status)
        VALUES (
            partner_record.partner_id,
            free_plan_id,
            'monthly',
            CURRENT_DATE,
            'paid'
        );

        assigned_count := assigned_count + 1;
        RAISE NOTICE 'Assigned Free Plan to partner ID: %, Name: % (Organization: %)', 
            partner_record.partner_id, partner_record.name, partner_record.org_name;
    END LOOP;

    -- Count therapists who already have subscriptions (for reporting)
    SELECT COUNT(DISTINCT p.id) INTO skipped_count
    FROM partners p
    INNER JOIN organizations o ON p.organization_id = o.id
    WHERE o.theraptrack_controlled = TRUE
      AND EXISTS (
          SELECT 1
          FROM partner_subscriptions ps
          WHERE ps.partner_id = p.id
      );

    RAISE NOTICE 'Migration completed.';
    RAISE NOTICE '  - Assigned Free Plan to % therapist(s) without subscriptions', assigned_count;
    RAISE NOTICE '  - Skipped % therapist(s) who already have subscriptions', skipped_count;
END $$;

