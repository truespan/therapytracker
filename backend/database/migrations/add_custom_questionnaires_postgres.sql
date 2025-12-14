-- Custom Questionnaire System Migration (PostgreSQL)
-- This migration creates tables for a flexible questionnaire management system

-- Table: questionnaires
-- Stores questionnaire templates created by partners
CREATE TABLE IF NOT EXISTS questionnaires (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_partner_id ON questionnaires(partner_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_created_at ON questionnaires(created_at);

-- Table: questionnaire_questions
-- Stores questions for each questionnaire
CREATE TABLE IF NOT EXISTS questionnaire_questions (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_questionnaire_id ON questionnaire_questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_order ON questionnaire_questions(questionnaire_id, question_order);

-- Table: questionnaire_answer_options
-- Stores answer options for each question
CREATE TABLE IF NOT EXISTS questionnaire_answer_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    option_value INTEGER NOT NULL,
    option_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questionnaire_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_options_question_id ON questionnaire_answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answer_options_order ON questionnaire_answer_options(question_id, option_order);

-- Table: user_questionnaire_assignments
-- Tracks which questionnaires are assigned to which users
CREATE TABLE IF NOT EXISTS user_questionnaire_assignments (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    partner_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_user_id ON user_questionnaire_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_partner_id ON user_questionnaire_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_questionnaire_id ON user_questionnaire_assignments(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_status ON user_questionnaire_assignments(status);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_assignments_assigned_at ON user_questionnaire_assignments(assigned_at);

-- Table: user_questionnaire_responses
-- Stores user responses to questionnaires
CREATE TABLE IF NOT EXISTS user_questionnaire_responses (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_option_id INTEGER NOT NULL,
    response_value INTEGER NOT NULL,
    session_id INTEGER NULL,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (answer_option_id) REFERENCES questionnaire_answer_options(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_assignment_id ON user_questionnaire_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_question_id ON user_questionnaire_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_session_id ON user_questionnaire_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_responses_responded_at ON user_questionnaire_responses(responded_at);

-- Add table comments (PostgreSQL syntax)
COMMENT ON TABLE questionnaires IS 'Stores questionnaire templates created by partners';
COMMENT ON TABLE questionnaire_questions IS 'Stores questions for each questionnaire';
COMMENT ON TABLE questionnaire_answer_options IS 'Stores answer options for each question';
COMMENT ON TABLE user_questionnaire_assignments IS 'Tracks which questionnaires are assigned to which users';
COMMENT ON TABLE user_questionnaire_responses IS 'Stores user responses to questionnaires';

-- Create trigger function to update updated_at timestamp
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







































