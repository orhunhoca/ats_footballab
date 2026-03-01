-- Add payment_type column to online_payments table
ALTER TABLE online_payments 
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'other';

-- Add check constraint for payment_type if needed, or leave as text
-- Ideally matches payment_history payment_type but simplified for now