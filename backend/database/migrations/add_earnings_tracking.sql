-- Migration: Add earnings and payouts tracking tables
-- Description: Creates tables to track earnings, payouts, and session statistics for partners and organizations
-- Date: 2025-01-XX

-- Step 1: Create earnings table to track earnings from payments
CREATE TABLE IF NOT EXISTS earnings (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('partner', 'organization')),
    razorpay_payment_id VARCHAR(255) REFERENCES razorpay_payments(razorpay_payment_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'available', 'held', 'withdrawn', 'cancelled')),
    session_id INTEGER REFERENCES therapy_sessions(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    payout_date DATE,
    payout_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create payouts table to track withdrawals
CREATE TABLE IF NOT EXISTS payouts (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('partner', 'organization')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payout_date DATE NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Add foreign key for payout_id in earnings table
ALTER TABLE earnings
ADD CONSTRAINT earnings_payout_id_fkey 
FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE SET NULL;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_earnings_recipient ON earnings(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_payout_date ON earnings(payout_date);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_payment_id ON earnings(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_earnings_session_id ON earnings(session_id);

CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON payouts(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_payout_date ON payouts(payout_date);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

-- Step 5: Add comments
COMMENT ON TABLE earnings IS 'Tracks earnings from payments for partners and organizations';
COMMENT ON TABLE payouts IS 'Tracks payouts/withdrawals for partners and organizations';
COMMENT ON COLUMN earnings.status IS 'pending: not yet available, available: ready for withdrawal, held: held for some reason, withdrawn: already paid out, cancelled: cancelled';
COMMENT ON COLUMN payouts.status IS 'pending: scheduled, processing: being processed, completed: successfully paid, failed: payment failed, cancelled: cancelled';








