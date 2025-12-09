-- Add default_report_template_id column to partners table
-- This allows partners to set a default report template for all their clients

ALTER TABLE partners
ADD COLUMN default_report_template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_partners_default_report_template ON partners(default_report_template_id);

COMMENT ON COLUMN partners.default_report_template_id IS 'Default report template for all clients of this partner';
