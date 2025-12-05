-- ============================================================================
-- Production Database Migration: Create All Tables
-- ============================================================================
-- This script creates all 18 tables required for the TheraP Track system
-- Execute this file in your production database to set up the complete schema
--
-- Execution: psql -U postgres -d your_database_name -f 01_create_all_tables.sql
-- ============================================================================

-- ============================================================================
-- PHASE 1: Base Tables (No Dependencies)
-- ============================================================================

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE admins IS 'Stores admin user information for system administration';

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_creation DATE NOT NULL DEFAULT CURRENT_DATE,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(50) NOT NULL,
    address TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gst_no VARCHAR(50),
    subscription_plan VARCHAR(50) CHECK (subscription_plan IN ('basic', 'basic_silver', 'basic_gold', 'pro_silver', 'pro_gold', 'pro_platinum')),
    is_active BOOLEAN DEFAULT TRUE,
    deactivated_at TIMESTAMP,
    deactivated_by INTEGER REFERENCES admins(id),
    video_sessions_enabled BOOLEAN DEFAULT TRUE
);

COMMENT ON COLUMN organizations.gst_no IS 'GST registration number for the organization';
COMMENT ON COLUMN organizations.subscription_plan IS 'Subscription tier: basic, basic_silver, basic_gold, pro_silver, pro_gold, or pro_platinum. NULL means no plan.';
COMMENT ON COLUMN organizations.is_active IS 'Whether the organization account is active';
COMMENT ON COLUMN organizations.deactivated_at IS 'Timestamp when organization was deactivated';
COMMENT ON COLUMN organizations.deactivated_by IS 'Admin ID who deactivated the organization';
COMMENT ON COLUMN organizations.video_sessions_enabled IS 'Whether video session functionality is enabled for this organization';

CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_video_sessions_enabled ON organizations(video_sessions_enabled);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sex VARCHAR(20) NOT NULL CHECK (sex IN ('Male', 'Female', 'Others')),
    age INTEGER NOT NULL CHECK (age > 0),
    email VARCHAR(255),
    contact VARCHAR(50) NOT NULL,
    address TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Auth Credentials Table
CREATE TABLE IF NOT EXISTS auth_credentials (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user', 'partner', 'organization', 'admin')),
    reference_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);

-- ============================================================================
-- PHASE 2: Dependent Base Tables
-- ============================================================================

-- 5. Partners Table
CREATE TABLE IF NOT EXISTS partners (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    deactivated_at TIMESTAMP,
    deactivated_by INTEGER REFERENCES organizations(id)
);

COMMENT ON COLUMN partners.is_active IS 'Whether the partner account is active (can login)';
COMMENT ON COLUMN partners.email_verified IS 'Whether the partner has verified their email address';
COMMENT ON COLUMN partners.verification_token IS 'Token for email verification (expires in 1 hour)';
COMMENT ON COLUMN partners.verification_token_expires IS 'Expiration timestamp for verification token';
COMMENT ON COLUMN partners.deactivated_at IS 'Timestamp when partner was deactivated';
COMMENT ON COLUMN partners.deactivated_by IS 'Organization ID that deactivated this partner';

CREATE INDEX IF NOT EXISTS idx_partners_organization ON partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_email_verified ON partners(email_verified);
CREATE INDEX IF NOT EXISTS idx_partners_verification_token ON partners(verification_token);

-- 6. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_email FOREIGN KEY (email) REFERENCES auth_credentials(email) ON DELETE CASCADE
);

COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset requests with 1-hour expiry';
COMMENT ON CONSTRAINT fk_password_reset_email ON password_reset_tokens IS 'Cascade delete password reset tokens when auth credentials are deleted';

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email);

-- ============================================================================
-- PHASE 3: Appointment & Session Tables
-- ============================================================================

-- 7. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    appointment_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE appointments IS 'Stores partner appointments with clients - independent of therapy sessions';

CREATE INDEX IF NOT EXISTS idx_appointments_partner ON appointments(partner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 8. Video Sessions Table
CREATE TABLE IF NOT EXISTS video_sessions (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    session_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_room_id VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    password_enabled BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE video_sessions IS 'Stores video conferencing sessions between partners and clients using Jitsi';
COMMENT ON COLUMN video_sessions.meeting_room_id IS 'Unique identifier for the Jitsi meeting room';
COMMENT ON COLUMN video_sessions.password IS 'Hashed password for session access (if password_enabled is true)';
COMMENT ON COLUMN video_sessions.password_enabled IS 'Whether password protection is enabled for this session';

CREATE INDEX IF NOT EXISTS idx_video_sessions_partner ON video_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_user ON video_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_date ON video_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_meeting_room ON video_sessions(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_partner_user ON video_sessions(partner_id, user_id);

-- ============================================================================
-- PHASE 4: Questionnaire System
-- ============================================================================

-- 9. Questionnaires Table
CREATE TABLE IF NOT EXISTS questionnaires (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    has_text_field BOOLEAN DEFAULT FALSE,
    text_field_label VARCHAR(500),
    text_field_placeholder TEXT,
    color_coding_scheme VARCHAR(10) DEFAULT NULL CHECK (color_coding_scheme IN ('4-point', '5-point', NULL))
);

COMMENT ON TABLE questionnaires IS 'Stores questionnaire templates created by partners';
COMMENT ON COLUMN questionnaires.color_coding_scheme IS 'Optional color coding for answer options: NULL (no coloring), 4-point (4 colors), or 5-point (5 colors). Colors are applied position-based from green (best) to red (worst).';

CREATE INDEX IF NOT EXISTS idx_questionnaires_partner_id ON questionnaires(partner_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_created_at ON questionnaires(created_at);

-- 10. Questionnaire Questions Table
CREATE TABLE IF NOT EXISTS questionnaire_questions (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sub_heading VARCHAR(255)
);

COMMENT ON TABLE questionnaire_questions IS 'Stores questions for each questionnaire';
COMMENT ON COLUMN questionnaire_questions.sub_heading IS 'Optional sub-heading to group questions together';

CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_questionnaire_id ON questionnaire_questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(questionnaire_id, question_order);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_sub_heading ON questionnaire_questions(questionnaire_id, sub_heading);

-- 11. Questionnaire Answer Options Table
CREATE TABLE IF NOT EXISTS questionnaire_answer_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
    option_text VARCHAR(255) NOT NULL,
    option_value INTEGER NOT NULL,
    option_order INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE questionnaire_answer_options IS 'Stores answer options for each question';

CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_options_question_id ON questionnaire_answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_options_order ON questionnaire_answer_options(question_id, option_order);

-- ============================================================================
-- PHASE 5: Assignment & Relationship Tables
-- ============================================================================

-- 12. User Partner Assignments Table
CREATE TABLE IF NOT EXISTS user_partner_assignments (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, partner_id)
);

-- 13. User Questionnaire Assignments Table
CREATE TABLE IF NOT EXISTS user_questionnaire_assignments (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TIMESTAMP
);

COMMENT ON TABLE user_questionnaire_assignments IS 'Tracks which questionnaires are assigned to which users';

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_user_id ON user_questionnaire_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_partner_id ON user_questionnaire_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_questionnaire_id ON user_questionnaire_assignments(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_status ON user_questionnaire_assignments(status);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_assigned_at ON user_questionnaire_assignments(assigned_at);

-- ============================================================================
-- PHASE 6: Therapy Sessions
-- ============================================================================

-- 14. Therapy Sessions Table
CREATE TABLE IF NOT EXISTS therapy_sessions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_title VARCHAR(255) NOT NULL,
    session_notes TEXT,
    payment_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_date TIMESTAMP NOT NULL,
    session_duration INTEGER,
    video_session_id INTEGER REFERENCES video_sessions(id) ON DELETE SET NULL
);

COMMENT ON TABLE therapy_sessions IS 'Therapy session records created from appointments';
COMMENT ON COLUMN therapy_sessions.appointment_id IS 'Reference to the appointment this session was created from';
COMMENT ON COLUMN therapy_sessions.partner_id IS 'Reference to the therapist/partner who conducted the session';
COMMENT ON COLUMN therapy_sessions.user_id IS 'Reference to the client/user who attended the session';
COMMENT ON COLUMN therapy_sessions.session_title IS 'Title/subject of the therapy session';
COMMENT ON COLUMN therapy_sessions.session_notes IS 'Therapist notes about the session content and observations';
COMMENT ON COLUMN therapy_sessions.payment_notes IS 'Payment-related information and notes';
COMMENT ON COLUMN therapy_sessions.session_date IS 'Date and time when the therapy session occurred (independent of appointment)';
COMMENT ON COLUMN therapy_sessions.session_duration IS 'Duration of the session in minutes';
COMMENT ON COLUMN therapy_sessions.video_session_id IS 'Reference to the video session this therapy session was created from (if applicable)';

CREATE INDEX IF NOT EXISTS idx_therapy_sessions_appointment ON therapy_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_partner ON therapy_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user ON therapy_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_created ON therapy_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_video_session ON therapy_sessions(video_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_sessions_unique_appointment ON therapy_sessions(appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================================================
-- PHASE 7: Response & Linking Tables
-- ============================================================================

-- 15. User Questionnaire Responses Table
CREATE TABLE IF NOT EXISTS user_questionnaire_responses (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
    answer_option_id INTEGER NOT NULL REFERENCES questionnaire_answer_options(id) ON DELETE CASCADE,
    response_value INTEGER NOT NULL,
    session_id INTEGER REFERENCES therapy_sessions(id) ON DELETE SET NULL,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_questionnaire_responses IS 'Stores user responses to questionnaires';

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_assignment_id ON user_questionnaire_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_question_id ON user_questionnaire_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_session_id ON user_questionnaire_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_responded_at ON user_questionnaire_responses(responded_at);

-- 16. User Questionnaire Text Responses Table
CREATE TABLE IF NOT EXISTS user_questionnaire_text_responses (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE,
    text_response TEXT,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_questionnaire_text_responses IS 'Stores user text responses for questionnaires with text fields';

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_text_responses_assignment_id ON user_questionnaire_text_responses(assignment_id);

-- 17. Session Questionnaire Assignments Table
CREATE TABLE IF NOT EXISTS session_questionnaire_assignments (
    id SERIAL PRIMARY KEY,
    therapy_session_id INTEGER NOT NULL REFERENCES therapy_sessions(id) ON DELETE CASCADE,
    user_questionnaire_assignment_id INTEGER NOT NULL REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (therapy_session_id, user_questionnaire_assignment_id)
);

COMMENT ON TABLE session_questionnaire_assignments IS 'Links therapy sessions to questionnaire assignments';
COMMENT ON COLUMN session_questionnaire_assignments.therapy_session_id IS 'Reference to the therapy session';
COMMENT ON COLUMN session_questionnaire_assignments.user_questionnaire_assignment_id IS 'Reference to the questionnaire assignment sent to the client';

CREATE INDEX IF NOT EXISTS idx_session_questionnaire_session ON session_questionnaire_assignments(therapy_session_id);
CREATE INDEX IF NOT EXISTS idx_session_questionnaire_assignment ON session_questionnaire_assignments(user_questionnaire_assignment_id);

-- ============================================================================
-- PHASE 8: Chart Sharing
-- ============================================================================

-- 18. Shared Charts Table
CREATE TABLE IF NOT EXISTS shared_charts (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chart_type VARCHAR(50) NOT NULL CHECK (chart_type IN ('radar_default', 'comparison', 'questionnaire_comparison')),
    selected_sessions TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    selected_assignments TEXT,
    chart_display_type VARCHAR(20) DEFAULT 'radar' CHECK (chart_display_type IN ('radar', 'line', 'bar'))
);

COMMENT ON COLUMN shared_charts.questionnaire_id IS 'Reference to the questionnaire type being compared';
COMMENT ON COLUMN shared_charts.selected_assignments IS 'JSON array of assignment IDs for questionnaire comparison';
COMMENT ON COLUMN shared_charts.chart_display_type IS 'Type of chart display: radar, line, or bar';

CREATE INDEX IF NOT EXISTS idx_shared_charts_user ON shared_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_charts_partner ON shared_charts(partner_id);
CREATE INDEX IF NOT EXISTS idx_shared_charts_partner_user ON shared_charts(partner_id, user_id);
CREATE INDEX IF NOT EXISTS idx_shared_charts_questionnaire ON shared_charts(questionnaire_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Create trigger function to update questionnaires.updated_at
CREATE OR REPLACE FUNCTION update_questionnaires_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for questionnaires table
DROP TRIGGER IF EXISTS trigger_update_questionnaires_updated_at ON questionnaires;
CREATE TRIGGER trigger_update_questionnaires_updated_at
    BEFORE UPDATE ON questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION update_questionnaires_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'All 18 tables created successfully!' as status;

-- Verify table creation
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'admins', 'appointments', 'auth_credentials', 'organizations', 'partners',
    'password_reset_tokens', 'questionnaire_answer_options', 'questionnaire_questions',
    'questionnaires', 'session_questionnaire_assignments', 'shared_charts',
    'therapy_sessions', 'user_partner_assignments', 'user_questionnaire_assignments',
    'user_questionnaire_responses', 'user_questionnaire_text_responses', 'users',
    'video_sessions'
)
ORDER BY table_name;












