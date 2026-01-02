-- System-wide settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES admins(id)
);

-- Create index on setting_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Insert default subscription plan setting
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
    'default_subscription_plan_id',
    NULL,
    'Default subscription plan ID for new TheraPTrack-controlled therapists and non-controlled organizations. Can be a trial plan or Free Plan.'
)
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (stored as text, parse as needed)';

