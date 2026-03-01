-- Create whatsapp_settings table for storing WhatsApp Business API configuration
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text,
  access_token text,
  business_account_id text,
  webhook_verify_token text,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view WhatsApp settings" ON whatsapp_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert WhatsApp settings" ON whatsapp_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update WhatsApp settings" ON whatsapp_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete WhatsApp settings" ON whatsapp_settings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create whatsapp_templates table for message templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_id text,
  template_type text CHECK (template_type IN ('payment_reminder', 'attendance_notification', 'general_announcement', 'custom')),
  message_content text NOT NULL,
  variables jsonb,
  language text DEFAULT 'tr',
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view templates" ON whatsapp_templates FOR SELECT USING (true);
CREATE POLICY "Admins can insert templates" ON whatsapp_templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update templates" ON whatsapp_templates FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete templates" ON whatsapp_templates FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create whatsapp_messages table for message history
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  recipient_name text,
  template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_content text NOT NULL,
  whatsapp_message_id text,
  status text CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view messages" ON whatsapp_messages FOR SELECT USING (true);
CREATE POLICY "Admins can insert messages" ON whatsapp_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update messages" ON whatsapp_messages FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_student ON whatsapp_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON whatsapp_templates(template_type);

-- Insert default message templates
INSERT INTO whatsapp_templates (template_name, template_type, message_content, variables, status)
VALUES
  ('Ödeme Hatırlatma', 'payment_reminder', 'Sayın {{1}}, {{2}} için {{3}} tarihinde {{4}} TL ödemeniz bulunmaktadır. Sportex Futbol Okulu', '["parent_name", "student_name", "payment_date", "amount"]'::jsonb, 'approved'),
  ('Yoklama Bildirimi', 'attendance_notification', 'Sayın {{1}}, {{2}} bugünkü antrenmanımıza {{3}}. Sportex Futbol Okulu', '["parent_name", "student_name", "attendance_status"]'::jsonb, 'approved'),
  ('Genel Duyuru', 'general_announcement', 'Sayın Velimiz, {{1}}. Sportex Futbol Okulu', '["announcement_text"]'::jsonb, 'approved')
ON CONFLICT DO NOTHING;