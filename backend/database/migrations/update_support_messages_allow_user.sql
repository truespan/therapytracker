-- =====================================================
-- Migration: Update Support Messages to Allow 'user' as sender_type
-- Purpose: Allow regular users (chat users) to send messages in support conversations
-- =====================================================

-- Step 1: Drop the existing CHECK constraint
-- =====================================================
ALTER TABLE support_messages
DROP CONSTRAINT IF EXISTS support_messages_sender_type_check;

-- Step 2: Add new CHECK constraint that includes 'user'
-- =====================================================
ALTER TABLE support_messages
ADD CONSTRAINT support_messages_sender_type_check 
CHECK (sender_type IN ('partner', 'organization', 'admin', 'user'));

COMMENT ON COLUMN support_messages.sender_type IS 'Type of sender: partner, organization, admin, or user';





