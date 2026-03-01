-- Create scheduled_messages table for managing scheduled WhatsApp messages
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type text NOT NULL CHECK (message_type IN ('training_reminder', 'payment_reminder', 'birthday', 'anniversary', 'general_announcement')),
  recipient_phone text NOT NULL,
  recipient_name text,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  template_name text NOT NULL,
  template_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamp with time zone,
  error_message text,
  recurrence_pattern text CHECK (recurrence_pattern IN ('once', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_student ON scheduled_messages(student_id);

-- Enable RLS
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their scheduled messages" ON scheduled_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create scheduled messages" ON scheduled_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their scheduled messages" ON scheduled_messages
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their scheduled messages" ON scheduled_messages
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create message_scheduler_settings table for configuring automated schedules
CREATE TABLE IF NOT EXISTS message_scheduler_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type text NOT NULL CHECK (setting_type IN ('training_reminder', 'payment_reminder', 'birthday_greeting')),
  enabled boolean DEFAULT true,
  hours_before integer, -- For reminders (e.g., 1 hour before training)
  days_before integer, -- For reminders (e.g., 15 days before payment)
  send_time time, -- Specific time to send (e.g., 09:00 for birthday)
  template_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(setting_type)
);

-- Insert default scheduler settings
INSERT INTO message_scheduler_settings (setting_type, enabled, hours_before, template_name)
VALUES 
  ('training_reminder', true, 1, 'training_reminder'),
  ('payment_reminder', true, NULL, 'payment_reminder'),
  ('birthday_greeting', true, NULL, 'birthday_greeting')
ON CONFLICT (setting_type) DO NOTHING;

-- Update payment_reminder with days_before
UPDATE message_scheduler_settings 
SET days_before = 15 
WHERE setting_type = 'payment_reminder';

-- Update birthday_greeting with send_time
UPDATE message_scheduler_settings 
SET send_time = '09:00:00' 
WHERE setting_type = 'birthday_greeting';

-- Enable RLS
ALTER TABLE message_scheduler_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view scheduler settings" ON message_scheduler_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update scheduler settings" ON message_scheduler_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);