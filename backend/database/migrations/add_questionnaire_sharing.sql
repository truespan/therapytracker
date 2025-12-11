-- Migration: Add questionnaire sharing support
-- Description: Enables Admin and Organization to create questionnaires and share them
-- Date: 2025-01-27

-- Step 1: Add new columns to questionnaires table
ALTER TABLE questionnaires 
ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20) CHECK (created_by_type IN ('admin', 'organization', 'partner')),
ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Make partner_id nullable (since admin and organization can also create questionnaires)
-- First, check if there are any NULL partner_ids (shouldn't be, but safe check)
DO $$
BEGIN
    -- Only proceed if partner_id is currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questionnaires' 
        AND column_name = 'partner_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE questionnaires ALTER COLUMN partner_id DROP NOT NULL;
    END IF;
END $$;

-- Step 3: Migrate existing data - set created_by_type to 'partner' for all existing questionnaires
UPDATE questionnaires 
SET created_by_type = 'partner' 
WHERE created_by_type IS NULL;

-- Step 4: Add constraint to ensure at least one owner field is set
ALTER TABLE questionnaires 
ADD CONSTRAINT chk_questionnaire_owner 
CHECK (
    (created_by_type = 'admin' AND admin_id IS NOT NULL AND partner_id IS NULL AND organization_id IS NULL) OR
    (created_by_type = 'organization' AND organization_id IS NOT NULL AND partner_id IS NULL AND admin_id IS NULL) OR
    (created_by_type = 'partner' AND partner_id IS NOT NULL AND admin_id IS NULL AND organization_id IS NULL)
);

-- Step 5: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_questionnaires_created_by_type ON questionnaires(created_by_type);
CREATE INDEX IF NOT EXISTS idx_questionnaires_admin_id ON questionnaires(admin_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_organization_id ON questionnaires(organization_id);

-- Step 6: Create questionnaire_shares table
CREATE TABLE IF NOT EXISTS questionnaire_shares (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    shared_by_type VARCHAR(20) NOT NULL CHECK (shared_by_type IN ('admin', 'organization')),
    shared_by_id INTEGER NOT NULL,
    shared_with_type VARCHAR(20) NOT NULL CHECK (shared_with_type IN ('organization', 'partner')),
    shared_with_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(questionnaire_id, shared_with_type, shared_with_id)
);

-- Step 7: Create indexes for questionnaire_shares table
CREATE INDEX IF NOT EXISTS idx_questionnaire_shares_questionnaire ON questionnaire_shares(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_shares_shared_by ON questionnaire_shares(shared_by_type, shared_by_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_shares_shared_with ON questionnaire_shares(shared_with_type, shared_with_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_shares_org ON questionnaire_shares(shared_with_id) WHERE shared_with_type = 'organization';
CREATE INDEX IF NOT EXISTS idx_questionnaire_shares_partner ON questionnaire_shares(shared_with_id) WHERE shared_with_type = 'partner';

-- Step 8: Add comments for documentation
COMMENT ON TABLE questionnaire_shares IS 'Tracks sharing of questionnaires from Admin to Organizations and Organizations to Partners';
COMMENT ON COLUMN questionnaire_shares.shared_by_type IS 'Type of entity sharing the questionnaire: admin or organization';
COMMENT ON COLUMN questionnaire_shares.shared_by_id IS 'ID of the admin or organization sharing the questionnaire';
COMMENT ON COLUMN questionnaire_shares.shared_with_type IS 'Type of entity receiving the shared questionnaire: organization or partner';
COMMENT ON COLUMN questionnaire_shares.shared_with_id IS 'ID of the organization or partner receiving the shared questionnaire';
COMMENT ON COLUMN questionnaires.created_by_type IS 'Type of entity that created the questionnaire: admin, organization, or partner';
COMMENT ON COLUMN questionnaires.admin_id IS 'ID of admin who created the questionnaire (if created_by_type is admin)';
COMMENT ON COLUMN questionnaires.organization_id IS 'ID of organization who created the questionnaire (if created_by_type is organization)';

-- Migration completed
SELECT 'Questionnaire sharing migration completed successfully' as message;

