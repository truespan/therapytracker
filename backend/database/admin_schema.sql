-- Admin Panel Schema
-- This file contains the admin table and necessary updates to organizations table

-- Create Admin table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update auth_credentials to support 'admin' user type
-- Note: The auth_credentials table uses TEXT type for user_type, so we can add 'admin' without schema changes
-- If your table uses ENUM, you would need: ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'admin';

-- Add new columns to organizations table for subscription and status
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('basic', 'silver', 'gold')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deactivated_by INTEGER REFERENCES admins(id);

-- Create index for admin email lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Create index for organization status
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Insert default admin account
-- Password: Admin@123
-- Hash generated with bcrypt, salt rounds = 10
INSERT INTO admins (name, email) 
VALUES ('Super Admin', 'admin@therapytracker.com')
ON CONFLICT (email) DO NOTHING;

-- Insert auth credentials for default admin
-- Note: This is a bcrypt hash of 'Admin@123'
-- You should generate a fresh hash using: bcrypt.hash('Admin@123', 10)
INSERT INTO auth_credentials (user_type, reference_id, email, password_hash) 
VALUES (
    'admin', 
    (SELECT id FROM admins WHERE email = 'admin@therapytracker.com'),
    'admin@therapytracker.com', 
    '$2b$10$rKZN0jJZ8X5Z5Z5Z5Z5Z5OeXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq'
)
ON CONFLICT (email) DO NOTHING;

-- Note: The password hash above is a placeholder. 
-- After running this script, you should update it with a proper hash by running:
-- UPDATE auth_credentials 
-- SET password_hash = '$2b$10$[your_generated_hash]'
-- WHERE email = 'admin@therapytracker.com';

COMMENT ON TABLE admins IS 'Stores admin user information for system administration';
COMMENT ON COLUMN organizations.gst_no IS 'GST registration number for the organization';
COMMENT ON COLUMN organizations.subscription_plan IS 'Subscription tier: basic, silver, or gold';
COMMENT ON COLUMN organizations.is_active IS 'Whether the organization account is active';
COMMENT ON COLUMN organizations.deactivated_at IS 'Timestamp when organization was deactivated';
COMMENT ON COLUMN organizations.deactivated_by IS 'Admin ID who deactivated the organization';

