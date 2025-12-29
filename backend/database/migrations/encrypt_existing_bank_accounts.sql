-- Migration: Encrypt existing bank account data
-- Description: Encrypts any existing plain text bank account data in partners and organizations tables
-- Date: 2025-01-XX
-- 
-- IMPORTANT: This migration requires ENCRYPTION_KEY to be set in environment
-- Run this migration using: node scripts/encrypt-existing-bank-accounts.js
-- (Script will be created to handle encryption in Node.js)

-- Note: This migration cannot be run directly via SQL because encryption
-- requires the Node.js encryption service. Use the Node.js script instead.

-- The script will:
-- 1. Find all partners and organizations with bank account data
-- 2. Check if data is already encrypted (by format: contains colons)
-- 3. Encrypt plain text data using AES-256-GCM
-- 4. Update the database with encrypted values

-- Encrypted format: iv:salt:encrypted:authTag (hex encoded)
-- Plain text format: Does not contain colons in the expected pattern

