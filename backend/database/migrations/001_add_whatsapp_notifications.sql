-- WhatsApp Notification Logging Table
-- This table stores all WhatsApp notification attempts for appointment confirmations

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'appointment_confirmation',
    status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'failed', 'delivered', 'read'
    twilio_message_sid VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_appointment ON whatsapp_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_user ON whatsapp_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_created_at ON whatsapp_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_twilio_sid ON whatsapp_notifications(twilio_message_sid);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_whatsapp_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_notifications_updated_at
    BEFORE UPDATE ON whatsapp_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_notifications_updated_at();

-- Add comment for documentation
COMMENT ON TABLE whatsapp_notifications IS 'Stores WhatsApp notification attempts for appointment confirmations';
COMMENT ON COLUMN whatsapp_notifications.status IS 'Current status of the WhatsApp message: pending, sent, failed, delivered, read';
COMMENT ON COLUMN whatsapp_notifications.twilio_message_sid IS 'Twilio message SID for tracking message status';

-- Grant permissions (adjust based on your database user setup)
-- GRANT SELECT, INSERT, UPDATE ON whatsapp_notifications TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE whatsapp_notifications_id_seq TO your_app_user;
