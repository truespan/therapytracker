-- Add generated reports table for partner-created reports
-- Partners generate reports from templates and can share them with clients

CREATE TABLE IF NOT EXISTS generated_reports (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL,

    -- Report content
    report_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_age INTEGER,
    client_sex VARCHAR(20),
    report_date DATE NOT NULL,
    description TEXT NOT NULL,

    -- Sharing status
    is_shared BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_generated_reports_partner_id ON generated_reports(partner_id);
CREATE INDEX idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX idx_generated_reports_shared ON generated_reports(is_shared, user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generated_reports_updated_at
    BEFORE UPDATE ON generated_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_report_timestamp();
