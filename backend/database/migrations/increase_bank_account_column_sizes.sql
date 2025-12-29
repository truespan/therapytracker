-- Migration: Increase bank account column sizes to accommodate encrypted data
-- Description: Encrypted data (AES-256-GCM format: iv:salt:encrypted:authTag) is much longer than plain text
-- Date: 2025-01-XX
-- 
-- Encrypted format breakdown:
-- - IV: 32 hex characters (16 bytes)
-- - Salt: 128 hex characters (64 bytes)
-- - Encrypted data: Variable length (typically 2x-3x original length)
-- - Auth tag: 32 hex characters (16 bytes)
-- - Separators: 3 colons
-- Total: ~230-500+ characters depending on input length

-- Update partners table
ALTER TABLE partners
ALTER COLUMN bank_account_number TYPE TEXT,
ALTER COLUMN bank_account_holder_name TYPE TEXT,
ALTER COLUMN bank_ifsc_code TYPE TEXT,
ALTER COLUMN bank_name TYPE TEXT;

-- Update organizations table
ALTER TABLE organizations
ALTER COLUMN bank_account_number TYPE TEXT,
ALTER COLUMN bank_account_holder_name TYPE TEXT,
ALTER COLUMN bank_ifsc_code TYPE TEXT,
ALTER COLUMN bank_name TYPE TEXT;

-- Add comments
COMMENT ON COLUMN partners.bank_account_number IS 'Bank account number (encrypted, stored as TEXT to accommodate encrypted format)';
COMMENT ON COLUMN partners.bank_account_holder_name IS 'Bank account holder name (encrypted, stored as TEXT)';
COMMENT ON COLUMN partners.bank_ifsc_code IS 'IFSC code (encrypted, stored as TEXT)';
COMMENT ON COLUMN partners.bank_name IS 'Bank name (encrypted, stored as TEXT)';

COMMENT ON COLUMN organizations.bank_account_number IS 'Bank account number (encrypted, stored as TEXT to accommodate encrypted format)';
COMMENT ON COLUMN organizations.bank_account_holder_name IS 'Bank account holder name (encrypted, stored as TEXT)';
COMMENT ON COLUMN organizations.bank_ifsc_code IS 'IFSC code (encrypted, stored as TEXT)';
COMMENT ON COLUMN organizations.bank_name IS 'Bank name (encrypted, stored as TEXT)';

