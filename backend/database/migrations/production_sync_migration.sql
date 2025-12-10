-- ============================================================================
-- PRODUCTION SYNC MIGRATION
-- ============================================================================
-- This script applies all pending migrations to sync production database
-- Run this script on your production database to fix missing columns/tables
-- Date: 2025-12-10
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. Add report templates table (Dec 9)
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON report_templates(created_at DESC);

CREATE OR REPLACE FUNCTION update_report_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS report_templates_updated_at ON report_templates;
CREATE TRIGGER report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_report_template_timestamp();

-- ============================================================================
-- 2. Add generated reports table (Dec 9)
-- ============================================================================
CREATE TABLE IF NOT EXISTS generated_reports (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL,
    report_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_age INTEGER,
    client_sex VARCHAR(20),
    report_date DATE NOT NULL,
    description TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_partner_id ON generated_reports(partner_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_shared ON generated_reports(is_shared, user_id);

CREATE OR REPLACE FUNCTION update_generated_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generated_reports_updated_at ON generated_reports;
CREATE TRIGGER generated_reports_updated_at
    BEFORE UPDATE ON generated_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_report_timestamp();

-- ============================================================================
-- 3. Add default_report_template_id to partners (Dec 9)
-- ============================================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS default_report_template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partners_default_template ON partners(default_report_template_id);

COMMENT ON COLUMN partners.default_report_template_id IS 'Default report template selected by the partner';

-- ============================================================================
-- 4. Add qualification to partners (Dec 9)
-- ============================================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_partners_qualification ON partners(qualification);

COMMENT ON COLUMN partners.qualification IS 'Professional qualification of the partner (e.g., M.A. Clinical Psychology)';

-- ============================================================================
-- 5. Add default_report_background to partners (Dec 9)
-- ============================================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS default_report_background VARCHAR(255);

UPDATE partners
SET default_report_background = 'report-background.jpg'
WHERE default_report_background IS NULL;

CREATE INDEX IF NOT EXISTS idx_partners_report_background ON partners(default_report_background);

COMMENT ON COLUMN partners.default_report_background IS 'Filename of the selected report background image from assets folder';

-- ============================================================================
-- 6. Update case history fields - Consolidate consanguinity (Dec 8)
-- ============================================================================
ALTER TABLE case_histories ADD COLUMN IF NOT EXISTS family_history_consanguinity TEXT;

-- Copy data from old fields if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='case_histories'
               AND column_name='family_history_consanguinity_present') THEN
        UPDATE case_histories
        SET family_history_consanguinity = family_history_consanguinity_present
        WHERE family_history_consanguinity_present IS NOT NULL AND family_history_consanguinity_present != '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='case_histories'
               AND column_name='family_history_consanguinity_absent') THEN
        UPDATE case_histories
        SET family_history_consanguinity = family_history_consanguinity_absent
        WHERE (family_history_consanguinity IS NULL OR family_history_consanguinity = '')
          AND family_history_consanguinity_absent IS NOT NULL
          AND family_history_consanguinity_absent != '';
    END IF;
END $$;

-- Drop old columns
ALTER TABLE case_histories DROP COLUMN IF EXISTS family_history_consanguinity_present;
ALTER TABLE case_histories DROP COLUMN IF EXISTS family_history_consanguinity_absent;

-- ============================================================================
-- 7. Add viewed_at to generated_reports (Dec 10)
-- ============================================================================
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_generated_reports_viewed_at ON generated_reports(viewed_at);

COMMENT ON COLUMN generated_reports.viewed_at IS 'Timestamp when the client first viewed the report';

-- ============================================================================
-- 8. Add license_id to partners (Dec 10)
-- ============================================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS license_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_partners_license_id ON partners(license_id);

COMMENT ON COLUMN partners.license_id IS 'Professional license ID or registration number';

-- ============================================================================
-- 9. Add sex to family members (Dec 10)
-- ============================================================================
ALTER TABLE case_history_family_members
ADD COLUMN IF NOT EXISTS sex VARCHAR(20);

COMMENT ON COLUMN case_history_family_members.sex IS 'Sex/Gender of the family member (Male/Female/Others)';

-- ============================================================================
-- 10. Add behavior_observation to mental_status_examinations (Dec 10)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name='mental_status_examinations') THEN
        ALTER TABLE mental_status_examinations
        ADD COLUMN IF NOT EXISTS behavior_observation TEXT;

        COMMENT ON COLUMN mental_status_examinations.behavior_observation IS 'Detailed observation of patient behavior during examination';
    END IF;
END $$;

-- ============================================================================
-- Commit transaction
-- ============================================================================
COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this after migration to verify all columns exist:
/*
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('partners', 'case_histories', 'generated_reports', 'report_templates', 'case_history_family_members', 'mental_status_examinations')
ORDER BY table_name, ordinal_position;
*/
