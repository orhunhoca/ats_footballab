-- Create training_programs table for structured training plans
CREATE TABLE training_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('defense', 'attack', 'technical', 'coordination', 'transitions', 'conditioning', 'tactical')),
  week_number INTEGER NOT NULL,
  session_number INTEGER NOT NULL CHECK (session_number IN (1, 2)),
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  objectives TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training_exercises table for individual exercises within programs
CREATE TABLE training_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  equipment_needed TEXT[],
  instructions TEXT NOT NULL,
  coaching_points TEXT[],
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_training_assignments table for assigning programs to groups
CREATE TABLE group_training_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  training_program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  notes TEXT,
  attendance_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_training_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_programs
CREATE POLICY "Coaches and admins can view training programs" ON training_programs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can create training programs" ON training_programs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update training programs" ON training_programs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete training programs" ON training_programs FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for training_exercises
CREATE POLICY "Coaches and admins can view exercises" ON training_exercises FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can create exercises" ON training_exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update exercises" ON training_exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete exercises" ON training_exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for group_training_assignments
CREATE POLICY "Coaches and admins can view assignments" ON group_training_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can create assignments" ON group_training_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update assignments" ON group_training_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete assignments" ON group_training_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create indexes for better query performance
CREATE INDEX idx_training_programs_category ON training_programs(category);
CREATE INDEX idx_training_programs_week ON training_programs(week_number);
CREATE INDEX idx_training_exercises_program ON training_exercises(program_id);
CREATE INDEX idx_group_assignments_group ON group_training_assignments(group_id);
CREATE INDEX idx_group_assignments_date ON group_training_assignments(scheduled_date);

-- Add comments
COMMENT ON TABLE training_programs IS 'Structured training programs with exercises and objectives';
COMMENT ON TABLE training_exercises IS 'Individual exercises that make up training programs';
COMMENT ON TABLE group_training_assignments IS 'Assigns training programs to groups with scheduling';