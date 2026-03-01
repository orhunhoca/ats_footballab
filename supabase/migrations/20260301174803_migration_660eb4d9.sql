-- Make payment_history_id nullable in online_payments since it's linked after success
ALTER TABLE online_payments ALTER COLUMN payment_history_id DROP NOT NULL;

-- Ensure payment_type column exists (in case previous query failed or wasn't run)
ALTER TABLE online_payments ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'other';