-- Migration: Add organization signup tokens table
-- This table stores secure tokens that organizations can share with therapists to signup

CREATE TABLE IF NOT EXISTS organization_signup_tokens (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_org_signup_tokens_token ON organization_signup_tokens(token);
CREATE INDEX IF NOT EXISTS idx_org_signup_tokens_org_id ON organization_signup_tokens(organization_id);

-- Each organization should have only one active token
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_signup_tokens_org_active
ON organization_signup_tokens(organization_id)
WHERE is_active = TRUE;
