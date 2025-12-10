-- Migration: Add license_id column to partners table
-- Purpose: Store practitioner license ID for therapists
-- Date: 2025-12-10

-- Add license_id column to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS license_id VARCHAR(100);

-- Add comment to column
COMMENT ON COLUMN partners.license_id IS 'Practitioner license ID (optional)';
