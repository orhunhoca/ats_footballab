-- Create enum for test types
CREATE TYPE test_type AS ENUM (
  '10m_dribbling',
  '20m_sprint',
  'shooting_accuracy',
  'passing_accuracy',
  'dribbling_cone',
  'coordination'
);

-- Update performance_tests table with proper structure
DROP TABLE IF EXISTS performance_tests CASCADE;

CREATE TABLE performance_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type test_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  notes TEXT,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_performance_tests_student ON performance_tests(student_id);
CREATE INDEX idx_performance_tests_date ON performance_tests(test_date);
CREATE INDEX idx_performance_tests_type ON performance_tests(test_type);

-- Enable RLS
ALTER TABLE performance_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view performance tests" 
  ON performance_tests FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert performance tests" 
  ON performance_tests FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update performance tests" 
  ON performance_tests FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete performance tests" 
  ON performance_tests FOR DELETE 
  USING (auth.uid() IS NOT NULL);