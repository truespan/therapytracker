-- Migration: Add color coding scheme support to questionnaires
-- Description: Allows partners to specify 4-point or 5-point color coding for answer options
-- Date: 2025-01-25

-- Add color_coding_scheme column to questionnaires table
ALTER TABLE questionnaires
ADD COLUMN IF NOT EXISTS color_coding_scheme VARCHAR(10) DEFAULT NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE questionnaires
ADD CONSTRAINT questionnaires_color_coding_scheme_check
CHECK (color_coding_scheme IN ('4-point', '5-point', NULL));

-- Add comment explaining the column
COMMENT ON COLUMN questionnaires.color_coding_scheme IS
'Optional color coding for answer options: NULL (no coloring), 4-point (4 colors), or 5-point (5 colors). Colors are applied position-based from green (best) to red (worst).';
