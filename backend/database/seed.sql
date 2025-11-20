-- Sample data for testing

-- Sample Organization
INSERT INTO organizations (name, email, contact, address) VALUES
('Wellness Center', 'contact@wellnesscenter.com', '+1-555-0100', '123 Health Street, Wellness City');

-- Sample Partners (password: password123)
-- Note: partner_id will be auto-generated if you use the signup endpoint
-- For seed data, we provide sample partner_ids
INSERT INTO partners (partner_id, name, sex, age, email, contact, organization_id) VALUES
('WE12345', 'Dr. Sarah Johnson', 'Female', 35, 'sarah.johnson@wellnesscenter.com', '+1-555-0101', 1),
('WE67890', 'Dr. Michael Chen', 'Male', 42, 'michael.chen@wellnesscenter.com', '+1-555-0102', 1);

-- Sample Users (password: password123)
INSERT INTO users (name, sex, age, email, contact) VALUES
('John Doe', 'Male', 28, 'john.doe@email.com', '+1-555-0201'),
('Jane Smith', 'Female', 32, 'jane.smith@email.com', '+1-555-0202');

-- Sample Auth Credentials (password: password123, hash generated with bcrypt)
-- Note: In production, these would be created through the signup endpoint
-- Hash for 'password123' with bcrypt rounds=10
INSERT INTO auth_credentials (user_type, reference_id, email, password_hash) VALUES
('organization', 1, 'contact@wellnesscenter.com', '$2b$10$gzxyitLRWHZjNIXKmZJ38uWCTpfNbwZoN/BV8qWllkfQbGMm8sica'),
('partner', 1, 'sarah.johnson@wellnesscenter.com', '$2b$10$gzxyitLRWHZjNIXKmZJ38uWCTpfNbwZoN/BV8qWllkfQbGMm8sica'),
('partner', 2, 'michael.chen@wellnesscenter.com', '$2b$10$gzxyitLRWHZjNIXKmZJ38uWCTpfNbwZoN/BV8qWllkfQbGMm8sica'),
('user', 1, 'john.doe@email.com', '$2b$10$gzxyitLRWHZjNIXKmZJ38uWCTpfNbwZoN/BV8qWllkfQbGMm8sica'),
('user', 2, 'jane.smith@email.com', '$2b$10$gzxyitLRWHZjNIXKmZJ38uWCTpfNbwZoN/BV8qWllkfQbGMm8sica');

-- Assign users to partners
INSERT INTO user_partner_assignments (user_id, partner_id) VALUES
(1, 1),
(2, 1);

