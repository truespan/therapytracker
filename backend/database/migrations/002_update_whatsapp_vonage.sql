-- Migration to update WhatsApp notifications table for Vonage integration
-- This migration changes from Twilio to Vonage message tracking

-- Add new column for Vonage message ID
ALTER TABLE whatsapp_notifications 
ADD COLUMN IF NOT EXISTS vonage_message_id VARCHAR(100);

-- Copy existing data from twilio_message_sid to vonage_message_id
UPDATE whatsapp_notifications 
SET vonage_message_id = twilio_message_sid 
WHERE twilio_message_sid IS NOT NULL;

-- Drop the old Twilio column
ALTER TABLE whatsapp_notifications 
DROP COLUMN IF EXISTS twilio_message_sid;

-- Update indexes
DROP INDEX IF EXISTS idx_whatsapp_notifications_twilio_sid;
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_vonage_id 
ON whatsapp_notifications(vonage_message_id);

-- Update comments
COMMENT ON COLUMN whatsapp_notifications.vonage_message_id IS 'Vonage message ID for tracking message status';

-- Update the updated_at trigger if needed (it should still work)
-- The trigger is already defined in the original migration
