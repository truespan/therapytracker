-- Migration: Add account setup tokens table
-- This table stores temporary tokens for account setup functionality
-- Used when clients book via public link and need to set up their password

CREATE TABLE IF NOT EXISTS account_setup_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token for fast lookup
CREATE INDEX idx_account_setup_token ON account_setup_tokens(token);

-- Create index on user_id for cleanup queries
CREATE INDEX idx_account_setup_user_id ON account_setup_tokens(user_id);

-- Add comment to document the table
COMMENT ON TABLE account_setup_tokens IS 'Stores temporary tokens for account setup requests with 7-day expiry';
