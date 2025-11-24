-- Migration: Update shared_charts table to support questionnaire-based charts
-- This replaces session-based comparisons with questionnaire-based comparisons

-- Add questionnaire-related columns
ALTER TABLE shared_charts
ADD COLUMN IF NOT EXISTS questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE;

ALTER TABLE shared_charts
ADD COLUMN IF NOT EXISTS selected_assignments TEXT; -- JSON array of assignment IDs

ALTER TABLE shared_charts
ADD COLUMN IF NOT EXISTS chart_display_type VARCHAR(20) DEFAULT 'radar'
CHECK (chart_display_type IN ('radar', 'line', 'bar'));

-- Update chart_type constraint to include new questionnaire comparison type
ALTER TABLE shared_charts DROP CONSTRAINT IF EXISTS shared_charts_chart_type_check;
ALTER TABLE shared_charts
ADD CONSTRAINT shared_charts_chart_type_check
CHECK (chart_type IN ('radar_default', 'comparison', 'questionnaire_comparison'));

-- Create index for questionnaire lookups
CREATE INDEX IF NOT EXISTS idx_shared_charts_questionnaire ON shared_charts(questionnaire_id);

-- Add comment for documentation
COMMENT ON COLUMN shared_charts.questionnaire_id IS 'Reference to the questionnaire type being compared';
COMMENT ON COLUMN shared_charts.selected_assignments IS 'JSON array of assignment IDs for questionnaire comparison';
COMMENT ON COLUMN shared_charts.chart_display_type IS 'Type of chart display: radar, line, or bar';
