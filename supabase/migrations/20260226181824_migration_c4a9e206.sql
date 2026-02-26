-- Add registration date fields and separate clothing payment tracking
ALTER TABLE students
ADD COLUMN IF NOT EXISTS registration_start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS registration_end_date date,
ADD COLUMN IF NOT EXISTS summer_clothing_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS winter_clothing_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summer_clothing_price numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS winter_clothing_price numeric(10,2) DEFAULT 0;

-- Create notifications table for renewal reminders
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('renewal_reminder', 'payment_due', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  scheduled_date date,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Anyone can view notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage notifications" ON notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Create function to auto-generate renewal reminders
CREATE OR REPLACE FUNCTION check_registration_renewals()
RETURNS void AS $$
BEGIN
  -- Insert renewal reminders for registrations ending in 20 days
  INSERT INTO notifications (student_id, type, title, message, scheduled_date)
  SELECT 
    s.id,
    'renewal_reminder',
    'Kayıt Yenileme Zamanı',
    'Öğrenci ' || s.name || ' için kayıt yenileme süresi 20 gün içinde dolacak. Kayıt bitiş tarihi: ' || s.registration_end_date,
    s.registration_end_date - INTERVAL '20 days'
  FROM students s
  WHERE 
    s.registration_end_date IS NOT NULL
    AND s.registration_end_date - INTERVAL '20 days' = CURRENT_DATE
    AND s.status = 'Aktif'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.student_id = s.id 
      AND n.type = 'renewal_reminder'
      AND n.scheduled_date = s.registration_end_date - INTERVAL '20 days'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE notifications IS 'Stores system notifications including registration renewal reminders';
COMMENT ON COLUMN students.registration_start_date IS 'Date when student registration starts (can be future date)';
COMMENT ON COLUMN students.registration_end_date IS 'Date when student registration ends (usually 1 year after start)';
COMMENT ON COLUMN students.summer_clothing_paid IS 'Whether summer clothing payment is completed';
COMMENT ON COLUMN students.winter_clothing_paid IS 'Whether winter clothing payment is completed';