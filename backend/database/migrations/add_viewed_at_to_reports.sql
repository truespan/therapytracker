-- Migration: Add viewed_at column to generated_reports table
-- Purpose: Track when clients view shared reports to manage notification counts
-- Date: 2025-12-10

-- Add viewed_at column to track when client views the report
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP;

-- Add index for faster queries on unread reports
CREATE INDEX IF NOT EXISTS idx_generated_reports_viewed_at
ON generated_reports(user_id, is_shared, viewed_at);

-- Add comment to column
COMMENT ON COLUMN generated_reports.viewed_at IS 'Timestamp when the client first viewed this shared report';
