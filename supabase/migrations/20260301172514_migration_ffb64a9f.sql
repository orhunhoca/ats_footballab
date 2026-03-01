-- Create whatsapp_chatbot_logs table for conversation history
CREATE TABLE IF NOT EXISTS whatsapp_chatbot_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  incoming_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  command_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_phone ON whatsapp_chatbot_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_student ON whatsapp_chatbot_logs(student_id);

-- Enable RLS
ALTER TABLE whatsapp_chatbot_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view chatbot logs" ON whatsapp_chatbot_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert chatbot logs" ON whatsapp_chatbot_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add incoming_message_id column to whatsapp_messages if not exists
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS incoming_message_id TEXT;