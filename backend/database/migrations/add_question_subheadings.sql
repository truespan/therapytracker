-- Add sub-heading support to questionnaire questions
-- This allows partners to group questions under optional sub-headings

-- Add sub_heading column to questionnaire_questions table
ALTER TABLE questionnaire_questions 
ADD COLUMN IF NOT EXISTS sub_heading VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_sub_heading 
ON questionnaire_questions(questionnaire_id, sub_heading);

COMMENT ON COLUMN questionnaire_questions.sub_heading IS 'Optional sub-heading to group questions together';












