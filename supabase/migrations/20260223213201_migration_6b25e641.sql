-- Add membership_end_date column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS membership_end_date date;

-- Update payment_status check constraint to include new statuses if needed
-- For now we'll just keep it flexible or use existing text field