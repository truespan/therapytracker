-- ============================================================================
-- Migration: Add WhatsApp Number Column to Users Table
-- ============================================================================
-- This migration adds a whatsapp_number column to the users table to support
-- separate WhatsApp numbers for client communication. The column is nullable
-- to maintain backward compatibility with existing records.
-- ============================================================================
-- Date: 2024-12-XX
-- ============================================================================

-- Add whatsapp_number column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Add comment to document the column
COMMENT ON COLUMN users.whatsapp_number IS 'WhatsApp contact number (with country code) for client communication. Separate from regular contact number.';

-- For existing records, you may want to copy contact to whatsapp_number initially
-- Uncomment the following if you want to backfill existing data:
-- UPDATE users 
-- SET whatsapp_number = contact 
-- WHERE whatsapp_number IS NULL AND contact IS NOT NULL;

-- Note: No index is added as this is an optional field and queries will likely
-- filter by contact (which already has an index) or by other indexed fields.
-- If you frequently query by whatsapp_number, consider adding an index:
-- CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);
