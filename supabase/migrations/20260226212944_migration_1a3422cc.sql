-- Relax RLS policies for students table to ensure visibility
DROP POLICY IF EXISTS "Users can view students" ON students;
DROP POLICY IF EXISTS "Anyone can view students" ON students;

CREATE POLICY "Anyone can view students" 
  ON students FOR SELECT 
  USING (true);

-- Ensure other operations are also permitted for now
DROP POLICY IF EXISTS "Users can insert students" ON students;
DROP POLICY IF EXISTS "Anyone can insert students" ON students;
CREATE POLICY "Anyone can insert students" ON students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update students" ON students;
DROP POLICY IF EXISTS "Anyone can update students" ON students;
CREATE POLICY "Anyone can update students" ON students FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete students" ON students;
DROP POLICY IF EXISTS "Anyone can delete students" ON students;
CREATE POLICY "Anyone can delete students" ON students FOR DELETE USING (true);