-- Add missing columns to whatsapp_messages table
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_type text;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_name text;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS template_variables jsonb;
ALTER TABLE whatsapp_messages ALTER COLUMN message_content DROP NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_type ON whatsapp_messages(message_type);