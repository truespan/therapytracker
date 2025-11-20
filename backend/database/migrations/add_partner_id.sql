-- Migration: Add partner_id column to partners table
-- Date: 2025-11-19
-- Description: Adds unique partner_id column for partner identification system

-- Add the partner_id column (initially nullable for existing records)
ALTER TABLE partners ADD COLUMN partner_id VARCHAR(7);

-- Create index for fast lookups
CREATE INDEX idx_partners_partner_id ON partners(partner_id);

-- Add unique constraint (will be enforced after populating existing records)
-- For new installations, this is already in schema.sql
-- For existing databases, you'll need to populate partner_id values first before adding UNIQUE constraint

-- Note: After running this migration, you need to:
-- 1. Generate partner_id values for all existing partners
-- 2. Run: ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL;
-- 3. Run: ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id);

