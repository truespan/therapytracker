-- Migration: Add Events and Event Enrollments Tables
-- Description: Adds support for therapist events and client enrollments
-- Date: 2024

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location TEXT,
    fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create event_enrollments table
CREATE TABLE IF NOT EXISTS event_enrollments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (enrollment_status IN ('pending', 'confirmed', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'free')),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_partner ON events(partner_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_event ON event_enrollments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_user ON event_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_enrollments_status ON event_enrollments(enrollment_status);

-- Add comment to tables for documentation
COMMENT ON TABLE events IS 'Stores events created by therapists that clients can enroll in';
COMMENT ON TABLE event_enrollments IS 'Tracks client enrollments in events, including payment and enrollment status';

COMMENT ON COLUMN events.fee_amount IS 'Event fee in currency units (default: 0.00 for free events)';
COMMENT ON COLUMN event_enrollments.enrollment_status IS 'Status: pending, confirmed, or cancelled';
COMMENT ON COLUMN event_enrollments.payment_status IS 'Status: pending (payment required), paid (payment completed), or free (no payment required)';
