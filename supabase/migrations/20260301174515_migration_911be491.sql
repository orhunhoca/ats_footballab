-- Add token column to online_payments table for iyzico matching
ALTER TABLE online_payments ADD COLUMN IF NOT EXISTS token text;
CREATE INDEX IF NOT EXISTS idx_online_payments_token ON online_payments(token);