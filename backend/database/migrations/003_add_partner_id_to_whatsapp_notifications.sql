-- Add partner_id column to whatsapp_notifications table
-- This supports partner-to-client WhatsApp messaging in theraptrack-controlled organizations

-- Add partner_id column
ALTER TABLE whatsapp_notifications
ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL;

-- Create index for partner_id queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_partner ON whatsapp_notifications(partner_id);

-- Update comments
COMMENT ON COLUMN whatsapp_notifications.partner_id IS 'Partner ID who sent the message (for partner-to-client messaging)';
COMMENT ON COLUMN whatsapp_notifications.appointment_id IS 'Appointment ID (for appointment-related notifications)';
COMMENT ON TABLE whatsapp_notifications IS 'Stores WhatsApp notification attempts for appointment confirmations and partner-to-client messaging';

-- Update existing records where possible (for appointment-based messages)
-- This links existing appointment notifications to their partner
UPDATE whatsapp_notifications wn
SET partner_id = a.partner_id
FROM appointments a
WHERE wn.appointment_id = a.id
AND wn.partner_id IS NULL;

-- Grant permissions (adjust based on your database user setup)
-- GRANT SELECT, INSERT, UPDATE ON whatsapp_notifications TO your_app_user;