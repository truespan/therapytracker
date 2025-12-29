-- Migration: Add bank account details for partners and organizations
-- Description: Adds bank account fields to partners and organizations tables for disbursement purposes
-- Date: 2025-01-XX

-- Step 1: Add bank account fields to partners table
-- Note: Using TEXT type to accommodate encrypted data format (iv:salt:encrypted:authTag)
-- Encrypted data is much longer than plain text (typically 200-500+ characters)
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bank_account_verified_at TIMESTAMP;

-- Step 2: Add bank account fields to organizations table
-- Note: Using TEXT type to accommodate encrypted data format (iv:salt:encrypted:authTag)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bank_account_verified_at TIMESTAMP;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_bank_verified ON partners(bank_account_verified);
CREATE INDEX IF NOT EXISTS idx_organizations_bank_verified ON organizations(bank_account_verified);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN partners.bank_account_holder_name IS 'Bank account holder name for disbursements';
COMMENT ON COLUMN partners.bank_account_number IS 'Bank account number for disbursements';
COMMENT ON COLUMN partners.bank_ifsc_code IS 'IFSC code for bank account';
COMMENT ON COLUMN partners.bank_name IS 'Name of the bank';
COMMENT ON COLUMN partners.bank_account_verified IS 'Whether bank account details have been verified by admin';
COMMENT ON COLUMN partners.bank_account_verified_at IS 'Timestamp when bank account was verified';

COMMENT ON COLUMN organizations.bank_account_holder_name IS 'Bank account holder name for disbursements';
COMMENT ON COLUMN organizations.bank_account_number IS 'Bank account number for disbursements';
COMMENT ON COLUMN organizations.bank_ifsc_code IS 'IFSC code for bank account';
COMMENT ON COLUMN organizations.bank_name IS 'Name of the bank';
COMMENT ON COLUMN organizations.bank_account_verified IS 'Whether bank account details have been verified by admin';
COMMENT ON COLUMN organizations.bank_account_verified_at IS 'Timestamp when bank account was verified';

