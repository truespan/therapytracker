-- Migration: Add Therapist Reviews Table
-- Description: Adds support for client reviews and ratings for therapists
-- Date: 2024

-- Create therapist_reviews table
CREATE TABLE IF NOT EXISTS therapist_reviews (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    therapist_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, therapist_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_therapist_reviews_therapist ON therapist_reviews(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_reviews_client ON therapist_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_therapist_reviews_published ON therapist_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_therapist_reviews_created_at ON therapist_reviews(created_at DESC);

-- Add comment to table for documentation
COMMENT ON TABLE therapist_reviews IS 'Stores client reviews and ratings for therapists';
COMMENT ON COLUMN therapist_reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN therapist_reviews.is_published IS 'Whether the therapist has selected this review to be displayed publicly';
COMMENT ON COLUMN therapist_reviews.feedback_text IS 'Textual feedback from the client';
