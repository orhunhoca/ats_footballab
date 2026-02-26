-- Create trial_students table for trial training sessions
CREATE TABLE IF NOT EXISTS trial_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  age_group TEXT,
  assigned_group_id UUID REFERENCES groups(id),
  trial_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Beklemede' CHECK (status IN ('Beklemede', 'Kayıt Oldu', 'Vazgeçti')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trial_students ENABLE ROW LEVEL SECURITY;

-- Create policies for trial_students
CREATE POLICY "Users can view trial students" ON trial_students FOR SELECT USING (true);
CREATE POLICY "Users can insert trial students" ON trial_students FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update trial students" ON trial_students FOR UPDATE USING (true);
CREATE POLICY "Users can delete trial students" ON trial_students FOR DELETE USING (true);

-- Add photo_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON TABLE trial_students IS 'Students in trial training sessions before full registration';
COMMENT ON COLUMN students.photo_url IS 'URL to student photo in Supabase Storage';