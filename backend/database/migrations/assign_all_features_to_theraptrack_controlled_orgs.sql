-- Migration: Assign subscription plans with all features to existing TheraPTrack controlled organizations
-- This ensures all organizations with theraptrack_controlled = true have all features enabled without payment
--
-- Purpose:
-- - Find all organizations with theraptrack_controlled = true
-- - Assign them a subscription plan with all features enabled (or highest tier plan)
-- - Set payment_status to 'paid' (if column exists)
-- - Set subscription_end_date to NULL (no expiration)
-- - Set subscription_start_date to current date or organization creation date

DO $$
DECLARE
    all_features_plan_id INTEGER;
    highest_plan_id INTEGER;
    selected_plan_id INTEGER;
    org_record RECORD;
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
    payment_status_exists BOOLEAN;
BEGIN
    -- Check if payment_status column exists in organizations table
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'payment_status'
    ) INTO payment_status_exists;

    -- Step 1: Try to find a plan with all features enabled
    SELECT id INTO all_features_plan_id
    FROM subscription_plans
    WHERE has_video = TRUE 
      AND has_whatsapp = TRUE 
      AND has_advanced_assessments = TRUE 
      AND has_report_generation = TRUE 
      AND has_custom_branding = TRUE 
      AND has_advanced_analytics = TRUE 
      AND has_blogs_events_announcements = TRUE 
      AND has_customized_feature_support = TRUE 
      AND has_priority_support = TRUE 
      AND has_email_support = TRUE
      AND is_active = TRUE
    ORDER BY plan_order DESC
    LIMIT 1;

    -- Step 2: If no plan with all features exists, use the highest order plan
    IF all_features_plan_id IS NULL THEN
        SELECT id INTO highest_plan_id
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY plan_order DESC
        LIMIT 1;
        
        selected_plan_id := highest_plan_id;
        RAISE NOTICE 'No plan with all features found. Using highest order plan (ID: %)', selected_plan_id;
    ELSE
        selected_plan_id := all_features_plan_id;
        RAISE NOTICE 'Found plan with all features (ID: %)', selected_plan_id;
    END IF;

    -- Step 3: If still no plan found, raise an error
    IF selected_plan_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription plans found. Please create at least one subscription plan first.';
    END IF;

    -- Step 4: Update all TheraPTrack controlled organizations
    FOR org_record IN
        SELECT 
            id,
            name,
            created_at,
            subscription_plan_id,
            subscription_start_date,
            subscription_end_date
        FROM organizations
        WHERE theraptrack_controlled = TRUE
        ORDER BY id
    LOOP
        -- Update organization with subscription plan
        IF payment_status_exists THEN
            -- Update with payment_status column
            UPDATE organizations
            SET 
                subscription_plan_id = selected_plan_id,
                subscription_billing_period = 'monthly',
                subscription_start_date = COALESCE(org_record.subscription_start_date, CURRENT_DATE),
                subscription_end_date = NULL, -- No expiration for TheraPTrack controlled orgs
                payment_status = 'paid' -- Mark as paid since it's owned by TheraPTrack
            WHERE id = org_record.id;
        ELSE
            -- Update without payment_status column (for older database schemas)
            UPDATE organizations
            SET 
                subscription_plan_id = selected_plan_id,
                subscription_billing_period = 'monthly',
                subscription_start_date = COALESCE(org_record.subscription_start_date, CURRENT_DATE),
                subscription_end_date = NULL -- No expiration for TheraPTrack controlled orgs
            WHERE id = org_record.id;
        END IF;

        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated organization ID: %, Name: % - Assigned plan ID: %', 
            org_record.id, org_record.name, selected_plan_id;
    END LOOP;

    -- Count organizations that were skipped (already had the correct plan)
    SELECT COUNT(*) INTO skipped_count
    FROM organizations
    WHERE theraptrack_controlled = TRUE
      AND subscription_plan_id = selected_plan_id
      AND subscription_end_date IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '  - Updated % TheraPTrack controlled organization(s)', updated_count;
    RAISE NOTICE '  - All organizations now have plan ID: % assigned', selected_plan_id;
    RAISE NOTICE '  - Payment status set to: paid (if column exists)';
    RAISE NOTICE '  - Subscription end date set to: NULL (no expiration)';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

