-- Migration: Add password reset tokens table
-- This table stores temporary tokens for password reset functionality

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token for fast lookup
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

-- Create index on email for cleanup queries
CREATE INDEX idx_password_reset_email ON password_reset_tokens(email);

-- Add comment to document the table
COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset requests with 1-hour expiry';

























