-- Add columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS clothing_size TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS health_report_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS work_group_hour TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_plan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_amount DECIMAL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Bekliyor';
ALTER TABLE students ADD COLUMN IF NOT EXISTS clothing_payment_status TEXT DEFAULT 'Ödenmedi';
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'Yeni Kayıt';
ALTER TABLE students ADD COLUMN IF NOT EXISTS installment_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS second_installment_amount DECIMAL;

-- Add role column to profiles table for authorization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'coach';

-- Create check constraints for data integrity
ALTER TABLE students ADD CONSTRAINT students_clothing_size_check 
  CHECK (clothing_size IN ('110', '128', '140', '152', '164', 'XS', 'S', 'M', 'L', 'XL'));

-- Create separate financial_logs table for detailed tracking if needed, 
-- but for now we'll track basics in students table to keep it simple as requested.