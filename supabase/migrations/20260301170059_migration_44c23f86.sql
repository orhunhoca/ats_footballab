-- Create whatsapp_media table for storing sent media (photos, documents)
CREATE TABLE IF NOT EXISTS whatsapp_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'document', 'video')),
  media_url text NOT NULL,
  caption text,
  file_name text,
  file_size integer,
  mime_type text,
  whatsapp_media_id text, -- WhatsApp's media ID
  sent_to jsonb DEFAULT '[]'::jsonb, -- Array of phone numbers
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for whatsapp_media
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_student ON whatsapp_media(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_group ON whatsapp_media(group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_type ON whatsapp_media(media_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_sent_at ON whatsapp_media(sent_at);

-- Enable RLS
ALTER TABLE whatsapp_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_media
CREATE POLICY "Users can view media" ON whatsapp_media
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert media" ON whatsapp_media
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update media" ON whatsapp_media
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete media" ON whatsapp_media
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create document_templates table for PDF templates
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL CHECK (template_type IN ('performance_report', 'payment_receipt', 'training_schedule', 'attendance_report')),
  template_name text NOT NULL,
  template_content jsonb NOT NULL, -- HTML template with placeholders
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(template_type)
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Users can view templates" ON document_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage templates" ON document_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default templates
INSERT INTO document_templates (template_type, template_name, template_content) VALUES
(
  'performance_report',
  'Aylık Performans Raporu',
  '{"title": "Performans Raporu", "sections": ["student_info", "attendance_summary", "coach_notes", "goals"]}'::jsonb
),
(
  'payment_receipt',
  'Ödeme Makbuzu',
  '{"title": "Ödeme Makbuzu", "sections": ["school_info", "student_info", "payment_details", "signature"]}'::jsonb
),
(
  'training_schedule',
  'Antrenman Programı',
  '{"title": "Haftalık Antrenman Programı", "sections": ["group_info", "schedule", "location"]}'::jsonb
),
(
  'attendance_report',
  'Yoklama Raporu',
  '{"title": "Aylık Yoklama Raporu", "sections": ["student_info", "attendance_list", "statistics"]}'::jsonb
)
ON CONFLICT (template_type) DO NOTHING;