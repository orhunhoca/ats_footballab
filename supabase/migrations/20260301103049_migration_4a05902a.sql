-- Update students table status constraint to include more deletion/suspension reasons
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check 
  CHECK (status IN ('Aktif', 'Pasif', 'Kayıt İptali', 'Ara Veriyor', 'Yönetim Sildi'));

-- Add payment_type column to payment_history to track what the payment was for
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_type text;
ALTER TABLE payment_history ADD CONSTRAINT payment_history_payment_type_check 
  CHECK (payment_type IN ('registration', 'summer_clothing', 'winter_clothing', 'other'));

-- Update existing records to have a default payment_type
UPDATE payment_history SET payment_type = 'registration' WHERE payment_type IS NULL;

-- Make payment_type NOT NULL after updating existing records
ALTER TABLE payment_history ALTER COLUMN payment_type SET NOT NULL;

-- Add index for faster filtering by payment type
CREATE INDEX IF NOT EXISTS idx_payment_history_type ON payment_history(payment_type);