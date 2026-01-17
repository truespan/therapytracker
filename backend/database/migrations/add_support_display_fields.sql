-- =====================================================
-- Migration: Add Support Display Name and Photo
-- Purpose: Allow support persons to set custom display name and photo for chat messages
-- =====================================================

-- Step 1: Add support_display_name and support_photo_url to partners table
-- =====================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS support_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS support_photo_url TEXT;

COMMENT ON COLUMN partners.support_display_name IS 'Custom display name for support chat messages. If null, uses regular name.';
COMMENT ON COLUMN partners.support_photo_url IS 'Custom photo URL for support chat messages. If null, uses regular photo_url.';

-- Step 2: Add support_display_name and support_photo_url to organizations table
-- =====================================================
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS support_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS support_photo_url TEXT;

COMMENT ON COLUMN organizations.support_display_name IS 'Custom display name for support chat messages. If null, uses regular name.';
COMMENT ON COLUMN organizations.support_photo_url IS 'Custom photo URL for support chat messages. If null, uses regular photo_url.';

-- Step 3: Add support_display_name and support_photo_url to admins table
-- =====================================================
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS support_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS support_photo_url TEXT;

COMMENT ON COLUMN admins.support_display_name IS 'Custom display name for support chat messages. If null, uses regular name.';
COMMENT ON COLUMN admins.support_photo_url IS 'Custom photo URL for support chat messages. If null, no photo is shown.';
