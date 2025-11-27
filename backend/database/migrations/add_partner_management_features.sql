-- Migration: Add partner management features
-- This migration adds columns and indexes to support organization-level partner management
-- including email verification, deactivation tracking, and partner status management

-- Add partner management columns to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deactivated_by INTEGER REFERENCES organizations(id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_verification_token ON partners(verification_token);
CREATE INDEX IF NOT EXISTS idx_partners_email_verified ON partners(email_verified);

-- Add comments for documentation
COMMENT ON COLUMN partners.is_active IS 'Whether the partner account is active (can login)';
COMMENT ON COLUMN partners.email_verified IS 'Whether the partner has verified their email address';
COMMENT ON COLUMN partners.verification_token IS 'Token for email verification (expires in 1 hour)';
COMMENT ON COLUMN partners.verification_token_expires IS 'Expiration timestamp for verification token';
COMMENT ON COLUMN partners.deactivated_at IS 'Timestamp when partner was deactivated';
COMMENT ON COLUMN partners.deactivated_by IS 'Organization ID that deactivated this partner';

-- Update existing partners to have is_active = TRUE and email_verified = TRUE
-- (Existing partners should remain functional)
UPDATE partners
SET is_active = TRUE,
    email_verified = TRUE
WHERE is_active IS NULL OR email_verified IS NULL;
