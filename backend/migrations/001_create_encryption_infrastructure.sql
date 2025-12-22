-- HIPAA & GDPR Encryption Infrastructure Migration
-- Creates tables for key management and audit logging

-- =============================================
-- ENCRYPTION KEY STORE
-- =============================================

CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(100) UNIQUE NOT NULL,
    key_type VARCHAR(50) NOT NULL CHECK (key_type IN ('master', 'organization', 'data')),
    encrypted_key TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    data_type VARCHAR(50), -- 'case_history', 'mental_status', 'questionnaire', 'appointment'
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'retired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP,
    retired_at TIMESTAMP,
    
    -- Ensure data_type is provided for data keys
    CONSTRAINT data_type_required_for_data_keys 
        CHECK (key_type != 'data' OR data_type IS NOT NULL),
    
    -- Ensure organization_id is provided for non-master keys
    CONSTRAINT organization_required_for_non_master_keys 
        CHECK (key_type = 'master' OR organization_id IS NOT NULL)
);

-- Indexes for efficient key lookup
CREATE INDEX idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX idx_encryption_keys_organization ON encryption_keys(organization_id);
CREATE INDEX idx_encryption_keys_type_status ON encryption_keys(key_type, status);
CREATE INDEX idx_encryption_keys_data_type ON encryption_keys(data_type);
CREATE INDEX idx_encryption_keys_created_at ON encryption_keys(created_at);

-- =============================================
-- ENCRYPTION AUDIT LOG
-- =============================================

CREATE TABLE IF NOT EXISTS encryption_audit_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'create', 'read', 'update', 'delete', 'key_management', 'authentication'
    data_type VARCHAR(50) NOT NULL, -- 'case_history', 'mental_status', 'questionnaire', 'appointment', 'key_management', 'authentication'
    record_id INTEGER, -- NULL for operations that don't target specific records
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    key_id VARCHAR(100) REFERENCES encryption_keys(key_id) ON DELETE SET NULL,
    key_version INTEGER,
    ip_address INET, -- For tracking access location
    user_agent TEXT, -- For tracking access device/browser
    access_reason TEXT, -- Business reason for accessing PHI (HIPAA requirement)
    fields_accessed TEXT[], -- Specific fields that were accessed (for fine-grained auditing)
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient audit log queries
CREATE INDEX idx_audit_log_created_at ON encryption_audit_log(created_at);
CREATE INDEX idx_audit_log_organization ON encryption_audit_log(organization_id);
CREATE INDEX idx_audit_log_user ON encryption_audit_log(user_id);
CREATE INDEX idx_audit_log_data_type ON encryption_audit_log(data_type);
CREATE INDEX idx_audit_log_operation ON encryption_audit_log(operation);
CREATE INDEX idx_audit_log_record ON encryption_audit_log(record_id, data_type);
CREATE INDEX idx_audit_log_success ON encryption_audit_log(success);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_log_org_date ON encryption_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_user_date ON encryption_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_type_record ON encryption_audit_log(data_type, record_id, created_at DESC);

-- =============================================
-- ENHANCED EXISTING TABLES WITH ENCRYPTION SUPPORT
-- =============================================

-- Add encryption support to case_histories table
ALTER TABLE case_histories 
ADD COLUMN IF NOT EXISTS encrypted_data JSONB,
ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100) REFERENCES encryption_keys(key_id),
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS blind_indexes JSONB; -- For searchable encrypted fields

-- Add encryption support to mental_status_examinations table
ALTER TABLE mental_status_examinations
ADD COLUMN IF NOT EXISTS encrypted_data JSONB,
ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100) REFERENCES encryption_keys(key_id),
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS blind_indexes JSONB;

-- Add encryption support to questionnaire_responses table
ALTER TABLE questionnaire_responses
ADD COLUMN IF NOT EXISTS encrypted_answer_text TEXT,
ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100) REFERENCES encryption_keys(key_id),
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Add encryption support to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS encrypted_notes TEXT,
ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100) REFERENCES encryption_keys(key_id),
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- =============================================
-- DATA RETENTION POLICY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL, -- 'case_history', 'mental_status', 'questionnaire', 'appointment', 'audit_log'
    retention_period_days INTEGER NOT NULL, -- How long to keep the data
    deletion_enabled BOOLEAN DEFAULT false, -- Whether automatic deletion is enabled
    notification_days INTEGER DEFAULT 30, -- Days before deletion to notify
    last_cleanup_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, data_type)
);

CREATE INDEX idx_retention_policies_organization ON data_retention_policies(organization_id);
CREATE INDEX idx_retention_policies_data_type ON data_retention_policies(data_type);

-- =============================================
-- DEFAULT DATA RETENTION POLICIES (HIPAA/GDPR Compliant)
-- =============================================

-- Insert default retention policies for each organization
INSERT INTO data_retention_policies (organization_id, data_type, retention_period_days, deletion_enabled)
SELECT 
    o.id as organization_id,
    dt.data_type,
    CASE 
        WHEN dt.data_type = 'audit_log' THEN 2555 -- 7 years for audit logs (HIPAA)
        WHEN dt.data_type = 'case_history' THEN 2555 -- 7 years for medical records
        WHEN dt.data_type = 'mental_status' THEN 2555 -- 7 years for mental health records
        WHEN dt.data_type = 'questionnaire' THEN 2555 -- 7 years for assessment data
        WHEN dt.data_type = 'appointment' THEN 2555 -- 7 years for appointment records
        ELSE 2555 -- Default to 7 years
    END as retention_period_days,
    false as deletion_enabled -- Default to manual deletion
FROM organizations o
CROSS JOIN (
    SELECT unnest(ARRAY['case_history', 'mental_status', 'questionnaire', 'appointment', 'audit_log']) as data_type
) dt
ON CONFLICT (organization_id, data_type) DO NOTHING;

-- =============================================
-- ENCRYPTION METADATA VIEW
-- =============================================

CREATE OR REPLACE VIEW encryption_status_summary AS
SELECT 
    'case_history' as data_type,
    COUNT(*) as total_records,
    COUNT(encrypted_data) as encrypted_records,
    COUNT(*) - COUNT(encrypted_data) as unencrypted_records,
    COUNT(DISTINCT encryption_key_id) as unique_keys_used
FROM case_histories

UNION ALL

SELECT 
    'mental_status_examination' as data_type,
    COUNT(*) as total_records,
    COUNT(encrypted_data) as encrypted_records,
    COUNT(*) - COUNT(encrypted_data) as unencrypted_records,
    COUNT(DISTINCT encryption_key_id) as unique_keys_used
FROM mental_status_examinations

UNION ALL

SELECT 
    'questionnaire_response' as data_type,
    COUNT(*) as total_records,
    COUNT(encrypted_answer_text) as encrypted_records,
    COUNT(*) - COUNT(encrypted_answer_text) as unencrypted_records,
    COUNT(DISTINCT encryption_key_id) as unique_keys_used
FROM questionnaire_responses

UNION ALL

SELECT 
    'appointment' as data_type,
    COUNT(*) as total_records,
    COUNT(encrypted_notes) as encrypted_records,
    COUNT(*) - COUNT(encrypted_notes) as unencrypted_records,
    COUNT(DISTINCT encryption_key_id) as unique_keys_used
FROM appointments;

-- =============================================
-- AUDIT LOG SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW audit_log_summary AS
SELECT 
    DATE(created_at) as audit_date,
    organization_id,
    data_type,
    operation,
    COUNT(*) as operation_count,
    COUNT(CASE WHEN success THEN 1 END) as successful_count,
    COUNT(CASE WHEN NOT success THEN 1 END) as failed_count,
    COUNT(DISTINCT user_id) as unique_users
FROM encryption_audit_log
GROUP BY DATE(created_at), organization_id, data_type, operation;

-- =============================================
-- SECURITY ALERTS VIEW
-- =============================================

CREATE OR REPLACE VIEW security_alerts AS
SELECT 
    'EXCESSIVE_FAILED_ACCESS' as alert_type,
    user_id,
    organization_id,
    COUNT(*) as failed_attempts,
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt
FROM encryption_audit_log
WHERE success = false AND user_id IS NOT NULL
GROUP BY user_id, organization_id
HAVING COUNT(*) > 5

UNION ALL

SELECT 
    'AFTER_HOURS_ACCESS' as alert_type,
    user_id,
    organization_id,
    COUNT(*) as access_count,
    MIN(created_at) as first_access,
    MAX(created_at) as last_access
FROM encryption_audit_log
WHERE EXTRACT(HOUR FROM created_at) < 6 OR EXTRACT(HOUR FROM created_at) > 22
GROUP BY user_id, organization_id
HAVING COUNT(*) > 10;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for HIPAA/GDPR compliant data protection';
COMMENT ON TABLE encryption_audit_log IS 'Audit log for all encryption operations and PHI access (HIPAA requirement)';
COMMENT ON TABLE data_retention_policies IS 'Data retention policies for HIPAA/GDPR compliance';

COMMENT ON COLUMN encryption_audit_log.operation IS 'Type of operation performed (encrypt, decrypt, create, read, update, delete, etc.)';
COMMENT ON COLUMN encryption_audit_log.data_type IS 'Type of data accessed (case_history, mental_status, questionnaire, appointment, etc.)';
COMMENT ON COLUMN encryption_audit_log.access_reason IS 'Business reason for accessing PHI (required by HIPAA)';
COMMENT ON COLUMN encryption_audit_log.fields_accessed IS 'Specific fields accessed for fine-grained auditing';
COMMENT ON COLUMN encryption_audit_log.ip_address IS 'IP address for tracking access location';
COMMENT ON COLUMN encryption_audit_log.user_agent IS 'User agent for tracking access device/browser';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant appropriate permissions to application user
-- Note: Adjust these based on your specific database user setup

-- GRANT SELECT, INSERT, UPDATE ON encryption_keys TO therapy_tracker_app;
-- GRANT SELECT, INSERT ON encryption_audit_log TO therapy_tracker_app;
-- GRANT SELECT, INSERT, UPDATE ON data_retention_policies TO therapy_tracker_app;

-- GRANT SELECT ON encryption_status_summary TO therapy_tracker_app;
-- GRANT SELECT ON audit_log_summary TO therapy_tracker_app;
-- GRANT SELECT ON security_alerts TO therapy_tracker_app;

-- =============================================
-- MIGRATION COMPLETION MARKER
-- =============================================

CREATE TABLE IF NOT EXISTS migration_metadata (
    migration_name VARCHAR(100) PRIMARY KEY,
    version INTEGER NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

INSERT INTO migration_metadata (migration_name, version, status)
VALUES ('001_create_encryption_infrastructure', 1, 'completed')
ON CONFLICT (migration_name) DO UPDATE SET
    version = EXCLUDED.version,
    applied_at = CURRENT_TIMESTAMP,
    status = EXCLUDED.status;

-- =============================================
-- POST-MIGRATION VERIFICATION
-- =============================================

-- Verify tables were created successfully
DO $$
DECLARE
    required_tables TEXT[] := ARRAY['encryption_keys', 'encryption_audit_log', 'data_retention_policies'];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing tables: %', missing_tables;
    END IF;
    
    RAISE NOTICE 'Encryption infrastructure migration completed successfully';
END $$;

-- =============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================

/*

To rollback this migration, execute the following commands in order:

1. Drop views first (dependent objects)
DROP VIEW IF EXISTS security_alerts;
DROP VIEW IF EXISTS audit_log_summary;
DROP VIEW IF EXISTS encryption_status_summary;

2. Drop new columns from existing tables
ALTER TABLE case_histories 
DROP COLUMN IF EXISTS encrypted_data,
DROP COLUMN IF EXISTS encryption_key_id,
DROP COLUMN IF EXISTS encryption_version,
DROP COLUMN IF EXISTS blind_indexes;

ALTER TABLE mental_status_examinations
DROP COLUMN IF EXISTS encrypted_data,
DROP COLUMN IF EXISTS encryption_key_id,
DROP COLUMN IF EXISTS encryption_version,
DROP COLUMN IF EXISTS blind_indexes;

ALTER TABLE questionnaire_responses
DROP COLUMN IF EXISTS encrypted_answer_text,
DROP COLUMN IF EXISTS encryption_key_id,
DROP COLUMN IF EXISTS encryption_version;

ALTER TABLE appointments
DROP COLUMN IF EXISTS encrypted_notes,
DROP COLUMN IF EXISTS encryption_key_id,
DROP COLUMN IF EXISTS encryption_version;

3. Drop new tables
DROP TABLE IF EXISTS data_retention_policies;
DROP TABLE IF EXISTS encryption_audit_log;
DROP TABLE IF EXISTS encryption_keys;
DROP TABLE IF EXISTS migration_metadata;

*/