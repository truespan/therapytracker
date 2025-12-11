-- Add text field support to questionnaires
-- This allows partners to add an optional text input at the top of questionnaires

-- Add columns to questionnaires table
ALTER TABLE questionnaires 
ADD COLUMN IF NOT EXISTS has_text_field BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS text_field_label VARCHAR(500),
ADD COLUMN IF NOT EXISTS text_field_placeholder TEXT;

-- Add table to store text field responses
CREATE TABLE IF NOT EXISTS user_questionnaire_text_responses (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    text_response TEXT,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES user_questionnaire_assignments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_questionnaire_text_responses_assignment_id 
ON user_questionnaire_text_responses(assignment_id);

COMMENT ON TABLE user_questionnaire_text_responses IS 'Stores user text responses for questionnaires with text fields';

































