-- ============================================================================
-- Migration: Add Qualification Degree to Partners Table
-- ============================================================================
-- This migration adds qualification_degree column to store educational 
-- qualifications/degrees of therapists (e.g., M.A. Clinical Psychology)
-- This is separate from the 'qualification' field which stores designation
-- ============================================================================

-- Add qualification_degree column
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS qualification_degree VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_qualification_degree ON partners(qualification_degree);

-- Add comment to explain the field
COMMENT ON COLUMN partners.qualification_degree IS 'Educational qualification/degree of the therapist (e.g., M.A. Clinical Psychology, Ph.D. Psychology). This is separate from the designation field (qualification column).';

-- Migration completed
SELECT 'Qualification degree column added to partners table successfully' as message;


