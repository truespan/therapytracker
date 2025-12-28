-- Migration: Add Razorpay Contact ID fields
-- Description: Adds razorpay_contact_id column to partners and organizations tables for payout management
-- Date: 2025-01-XX

-- Add razorpay_contact_id to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS razorpay_contact_id VARCHAR(255);

-- Add razorpay_contact_id to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS razorpay_contact_id VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_razorpay_contact ON partners(razorpay_contact_id);
CREATE INDEX IF NOT EXISTS idx_organizations_razorpay_contact ON organizations(razorpay_contact_id);

-- Add comments
COMMENT ON COLUMN partners.razorpay_contact_id IS 'Razorpay contact ID for payout processing';
COMMENT ON COLUMN organizations.razorpay_contact_id IS 'Razorpay contact ID for payout processing';

