-- ============================================================================
-- Migration: Add Availability Slots Feature
-- ============================================================================
-- This migration creates the availability_slots table for managing
-- therapist availability schedules that clients can view and book
-- ============================================================================

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS availability_slots (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Date and time fields
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,

  -- Status and availability
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'available_online',
    'available_offline',
    'not_available_online',
    'not_available_offline',
    'booked'
  )),
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('online', 'offline')),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,

  -- Booking information
  booked_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  booked_at TIMESTAMP,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,

  -- Publishing mechanism
  is_published BOOLEAN DEFAULT FALSE,
  last_published_at TIMESTAMP,

  -- Google Calendar conflict tracking
  has_google_conflict BOOLEAN DEFAULT FALSE,
  google_conflict_details TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE availability_slots IS 'Stores therapist availability schedules for the next 7 days';
COMMENT ON COLUMN availability_slots.slot_date IS 'The date of the availability slot';
COMMENT ON COLUMN availability_slots.start_datetime IS 'Combined datetime for efficient conflict checking';
COMMENT ON COLUMN availability_slots.is_available IS 'Derived from status: true for available_*, false for not_available_*';
COMMENT ON COLUMN availability_slots.is_published IS 'Whether slot is visible to clients';
COMMENT ON COLUMN availability_slots.archived_at IS 'Timestamp for soft deletion (older than 7 days)';

-- Create indexes for performance
CREATE INDEX idx_availability_slots_partner ON availability_slots(partner_id);
CREATE INDEX idx_availability_slots_date ON availability_slots(slot_date);
CREATE INDEX idx_availability_slots_datetime ON availability_slots(start_datetime, end_datetime);
CREATE INDEX idx_availability_slots_user ON availability_slots(booked_by_user_id);
CREATE INDEX idx_availability_slots_published ON availability_slots(is_published);
CREATE INDEX idx_availability_slots_archived ON availability_slots(archived_at);
CREATE INDEX idx_availability_slots_status ON availability_slots(status);

-- Create unique constraint to prevent duplicate slots for same partner/time
-- Only applies to non-archived slots
CREATE UNIQUE INDEX idx_unique_partner_slot
  ON availability_slots(partner_id, start_datetime)
  WHERE archived_at IS NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
