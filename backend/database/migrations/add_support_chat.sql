-- =====================================================
-- Migration: Add Support Chat System
-- Purpose: Add query_resolver flags and support chat tables for AI support system
-- =====================================================

-- Step 1: Add query_resolver flag to partners table
-- =====================================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS query_resolver BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_partners_query_resolver ON partners(query_resolver);

COMMENT ON COLUMN partners.query_resolver IS 'Whether this partner can resolve support queries (technical support team member)';

-- Step 2: Add query_resolver flag to organizations table
-- =====================================================
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS query_resolver BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_organizations_query_resolver ON organizations(query_resolver);

COMMENT ON COLUMN organizations.query_resolver IS 'Whether this organization can resolve support queries (technical support team member)';

-- Step 3: Create support_conversations table
-- =====================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id SERIAL PRIMARY KEY,
  requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('partner', 'organization')),
  requester_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  priority INTEGER DEFAULT 0, -- Priority based on subscription plan's plan_order (higher = higher priority)
  subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_requester ON support_conversations(requester_type, requester_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_priority ON support_conversations(priority DESC, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message ON support_conversations(last_message_at DESC);

COMMENT ON TABLE support_conversations IS 'Stores support chat conversations between app users and technical support team';
COMMENT ON COLUMN support_conversations.requester_type IS 'Type of user requesting support: partner or organization';
COMMENT ON COLUMN support_conversations.requester_id IS 'ID of the partner or organization requesting support';
COMMENT ON COLUMN support_conversations.priority IS 'Priority level based on subscription plan order (higher plan_order = higher priority)';
COMMENT ON COLUMN support_conversations.subscription_plan_id IS 'Current subscription plan ID of the requester at time of conversation creation';

-- Step 4: Create support_messages table
-- =====================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('partner', 'organization', 'admin')),
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender ON support_messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at);

COMMENT ON TABLE support_messages IS 'Stores individual messages in support conversations';
COMMENT ON COLUMN support_messages.sender_type IS 'Type of sender: partner, organization, or admin';
COMMENT ON COLUMN support_messages.sender_id IS 'ID of the sender (partner, organization, or admin)';
COMMENT ON COLUMN support_messages.read_at IS 'Timestamp when the message was read by the recipient';

-- Step 5: Create function to update conversation's updated_at and last_message_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_support_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_conversations
  SET updated_at = CURRENT_TIMESTAMP,
      last_message_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_conversation_on_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_conversation_timestamp();

COMMENT ON FUNCTION update_support_conversation_timestamp() IS 'Automatically updates conversation timestamp when new message is added';

