-- Migration to add admin support to the therapy tracker system
-- Run this after the main schema.sql

-- Step 1: Drop the existing CHECK constraint on auth_credentials if it exists
ALTER TABLE auth_credentials DROP CONSTRAINT IF EXISTS auth_credentials_user_type_check;

-- Step 2: Add the updated CHECK constraint that includes 'admin'
ALTER TABLE auth_credentials 
ADD CONSTRAINT auth_credentials_user_type_check 
CHECK (user_type IN ('user', 'partner', 'organization', 'admin'));

-- Step 3: Create Admin table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Add new columns to organizations table for subscription and status
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('basic', 'silver', 'gold')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deactivated_by INTEGER REFERENCES admins(id);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Step 6: Add comments
COMMENT ON TABLE admins IS 'Stores admin user information for system administration';
COMMENT ON COLUMN organizations.gst_no IS 'GST registration number for the organization';
COMMENT ON COLUMN organizations.subscription_plan IS 'Subscription tier: basic, silver, or gold';
COMMENT ON COLUMN organizations.is_active IS 'Whether the organization account is active';
COMMENT ON COLUMN organizations.deactivated_at IS 'Timestamp when organization was deactivated';
COMMENT ON COLUMN organizations.deactivated_by IS 'Admin ID who deactivated the organization';

-- Step 7: Insert default admin account
-- This will create the admin with a placeholder password hash
-- You MUST run the setup script to generate the real password hash
INSERT INTO admins (name, email) 
VALUES ('Super Admin', 'admin@therapytracker.com')
ON CONFLICT (email) DO NOTHING;

-- Step 8: Create auth credentials for admin (with placeholder hash)
-- The actual password will be 'Admin@123' after running the setup script
INSERT INTO auth_credentials (user_type, reference_id, email, password_hash) 
SELECT 
    'admin',
    a.id,
    'admin@therapytracker.com',
    '$2b$10$placeholder.hash.will.be.replaced.by.setup.script'
FROM admins a 
WHERE a.email = 'admin@therapytracker.com'
ON CONFLICT (email) DO NOTHING;

-- Migration completed successfully
SELECT 'Admin support migration completed. Run the setup script to set the admin password.' as message;

