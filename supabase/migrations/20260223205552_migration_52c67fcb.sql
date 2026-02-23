-- Create coaches table
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  experience TEXT,
  license TEXT,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Pasif')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT NOT NULL,
  color TEXT DEFAULT 'emerald' CHECK (color IN ('emerald', 'blue', 'red', 'amber', 'purple', 'pink')),
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 5 AND age <= 18),
  phone TEXT,
  email TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Pasif')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_groups junction table (many-to-many)
CREATE TABLE student_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, group_id)
);

-- Create attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

-- Create group_schedule table for training times
CREATE TABLE group_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaches
CREATE POLICY "Anyone can view coaches" ON coaches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert coaches" ON coaches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update coaches" ON coaches FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete coaches" ON coaches FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for groups
CREATE POLICY "Anyone can view groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert groups" ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update groups" ON groups FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete groups" ON groups FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for students
CREATE POLICY "Anyone can view students" ON students FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert students" ON students FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update students" ON students FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete students" ON students FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for student_groups
CREATE POLICY "Anyone can view student groups" ON student_groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage student groups" ON student_groups FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for attendance
CREATE POLICY "Anyone can view attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage attendance" ON attendance FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for group_schedule
CREATE POLICY "Anyone can view schedules" ON group_schedule FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage schedules" ON group_schedule FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_created_at ON students(created_at);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_student_groups_student ON student_groups(student_id);
CREATE INDEX idx_student_groups_group ON student_groups(group_id);