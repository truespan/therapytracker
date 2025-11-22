-- Migration: Add shared_charts table for chart sharing feature
-- This allows partners to share custom charts with their clients

-- Create shared_charts table
CREATE TABLE IF NOT EXISTS shared_charts (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chart_type VARCHAR(50) NOT NULL CHECK (chart_type IN ('radar_default', 'comparison')),
    selected_sessions TEXT, -- JSON array of session numbers for comparison charts
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_charts_user ON shared_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_charts_partner ON shared_charts(partner_id);
CREATE INDEX IF NOT EXISTS idx_shared_charts_partner_user ON shared_charts(partner_id, user_id);

