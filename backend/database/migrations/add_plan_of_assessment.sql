-- Plan of Assessment data for partner dashboard
-- Stores array of assessment items per user/partner combination

CREATE TABLE IF NOT EXISTS plan_of_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    plan_of_assessment JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT plan_of_assessments_user_partner_unique UNIQUE (user_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_poa_user ON plan_of_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_poa_partner ON plan_of_assessments(partner_id);

