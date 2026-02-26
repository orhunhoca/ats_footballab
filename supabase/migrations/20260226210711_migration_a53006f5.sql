-- Add new columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS school TEXT;

-- Create schools table for managing school list
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Schools policies (anyone can view, only admins can modify)
CREATE POLICY "Anyone can view schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Admins can insert schools" ON schools FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update schools" ON schools FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can delete schools" ON schools FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Insert some common schools as examples
INSERT INTO schools (name, address) VALUES
  ('İstanbul Anadolu Lisesi', 'İstanbul'),
  ('Kadıköy İlkokulu', 'İstanbul'),
  ('Beşiktaş Ortaokulu', 'İstanbul'),
  ('Galatasaray Lisesi', 'İstanbul')
ON CONFLICT (name) DO NOTHING;

-- Create performance_tests table for future use
CREATE TABLE IF NOT EXISTS performance_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT NOT NULL, -- '10m_dribbling', 'shooting', 'passing', etc.
  result_value DECIMAL(10,2), -- time in seconds or score
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on performance_tests
ALTER TABLE performance_tests ENABLE ROW LEVEL SECURITY;

-- Performance tests policies
CREATE POLICY "Authenticated users can view performance tests" ON performance_tests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coaches and admins can insert tests" ON performance_tests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coach'))
);
CREATE POLICY "Coaches and admins can update tests" ON performance_tests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coach'))
);
CREATE POLICY "Admins can delete tests" ON performance_tests FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_performance_tests_student ON performance_tests(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_tests_date ON performance_tests(test_date);