-- TheraP Track Database Schema

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS blogs CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_partner_assignments CASCADE;
DROP TABLE IF EXISTS profile_fields CASCADE;
DROP TABLE IF EXISTS auth_credentials CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_creation DATE NOT NULL DEFAULT CURRENT_DATE,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(50) NOT NULL,
    address TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partners (Therapists) table
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    partner_id VARCHAR(7) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    sex VARCHAR(20) NOT NULL CHECK (sex IN ('Male', 'Female', 'Others')),
    age INTEGER NOT NULL CHECK (age > 0),
    email VARCHAR(255),
    contact VARCHAR(50) NOT NULL,
    address TEXT,
    photo_url TEXT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    can_post_blogs BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Patients) table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sex VARCHAR(20) NOT NULL CHECK (sex IN ('Male', 'Female', 'Others')),
    age INTEGER NOT NULL CHECK (age > 0),
    email VARCHAR(255),
    contact VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Authentication credentials table
CREATE TABLE auth_credentials (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user', 'partner', 'organization')),
    reference_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile fields table (default + custom fields)
CREATE TABLE profile_fields (
    id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('rating_5', 'rating_4', 'energy_levels', 'sleep_quality')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Emotional Well-being', 'Social & Relationships', 'Physical Health', 'Daily Functioning', 'Self-Care & Coping', 'Others')),
    is_default BOOLEAN DEFAULT FALSE,
    created_by_user_id INTEGER,
    created_by_partner_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Partner assignments (many-to-many relationship)
CREATE TABLE user_partner_assignments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, partner_id)
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    session_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    feedback_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table (stores ratings for each session)
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    field_id INTEGER NOT NULL REFERENCES profile_fields(id) ON DELETE CASCADE,
    rating_value VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact submissions table
CREATE TABLE contact_submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blogs table
CREATE TABLE blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(100),
    author_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    author_type VARCHAR(20) NOT NULL DEFAULT 'partner',
    featured_image_url TEXT,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_partners_organization ON partners(organization_id);
CREATE INDEX idx_partners_partner_id ON partners(partner_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_partner ON sessions(partner_id);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_session ON user_profiles(session_id);
CREATE INDEX idx_auth_credentials_email ON auth_credentials(email);
CREATE INDEX idx_profile_fields_user_session ON profile_fields(user_id, session_id);
CREATE INDEX idx_profile_fields_session ON profile_fields(session_id);
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at);
CREATE INDEX idx_blogs_author ON blogs(author_id);
CREATE INDEX idx_blogs_published ON blogs(published, published_at);
CREATE INDEX idx_blogs_category ON blogs(category);
CREATE INDEX idx_blogs_created_at ON blogs(created_at);

-- Insert default profile fields
-- Rating scale: "Excellent", "Good", "Fair", "Poor", "Very Poor"
INSERT INTO profile_fields (field_name, field_type, category, is_default) VALUES
-- Emotional Well-being (4 fields)
('How would you rate your overall mood this week?', 'rating_5', 'Emotional Well-being', TRUE),
('How well are you managing stress in your daily life?', 'rating_5', 'Emotional Well-being', TRUE),
('How would you rate your anxiety levels?', 'rating_5', 'Emotional Well-being', TRUE),
('How well can you identify and express your emotions?', 'rating_5', 'Emotional Well-being', TRUE),

-- Social & Relationships (4 fields)
('How would you rate your current relationships with family and friends?', 'rating_5', 'Social & Relationships', TRUE),
('How effectively do you communicate with others?', 'rating_5', 'Social & Relationships', TRUE),
('How well are you maintaining healthy boundaries?', 'rating_5', 'Social & Relationships', TRUE),
('How satisfied are you with your social support system?', 'rating_5', 'Social & Relationships', TRUE),

-- Physical Health (5 fields)
('How would you rate your overall physical health?', 'rating_5', 'Physical Health', TRUE),
('How consistent are you with physical activity or exercise?', 'rating_5', 'Physical Health', TRUE),
('How would you rate your eating habits and nutrition?', 'rating_5', 'Physical Health', TRUE),
('How well are you managing any physical pain or discomfort?', 'rating_5', 'Physical Health', TRUE),
('How would you rate your digestive health and comfort?', 'rating_5', 'Physical Health', TRUE),

-- Daily Functioning (4 fields)
('How would you rate your sleep quality?', 'rating_5', 'Daily Functioning', TRUE),
('How would you rate your energy levels throughout the day?', 'rating_5', 'Daily Functioning', TRUE),
('How well can you concentrate on tasks?', 'rating_5', 'Daily Functioning', TRUE),
('How would you rate your motivation to complete daily activities?', 'rating_5', 'Daily Functioning', TRUE),

-- Self-Care & Coping (4 fields)
('How well are you practicing self-care activities?', 'rating_5', 'Self-Care & Coping', TRUE),
('How effective are your coping strategies when dealing with difficulties?', 'rating_5', 'Self-Care & Coping', TRUE),
('How would you rate your attention to physical health?', 'rating_5', 'Self-Care & Coping', TRUE),
('How often do you engage in mindfulness or relaxation practices?', 'rating_5', 'Self-Care & Coping', TRUE),

-- Others (1 field)
('Are you getting disturbing dreams repeatedly?', 'rating_5', 'Others', TRUE);

