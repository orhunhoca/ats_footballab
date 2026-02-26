-- Önce mevcut parent kolonlarını kaldırıp yeni anne-baba kolonları ekleyelim
ALTER TABLE students 
DROP COLUMN IF EXISTS parent_name,
DROP COLUMN IF EXISTS parent_phone,
ADD COLUMN mother_name TEXT,
ADD COLUMN mother_phone TEXT,
ADD COLUMN father_name TEXT,
ADD COLUMN father_phone TEXT;

-- RLS politikalarını güncelleyelim - authenticated kontrolünü kaldıralım, anyone can insert/update
DROP POLICY IF EXISTS "Authenticated users can insert students" ON students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON students;

CREATE POLICY "Anyone can insert students" ON students
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update students" ON students
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete students" ON students
FOR DELETE USING (true);

-- Diğer tablolar için de aynı şeyi yapalım (coaches, groups, attendance vb)
DROP POLICY IF EXISTS "Authenticated users can insert coaches" ON coaches;
DROP POLICY IF EXISTS "Authenticated users can update coaches" ON coaches;
DROP POLICY IF EXISTS "Authenticated users can delete coaches" ON coaches;

CREATE POLICY "Anyone can insert coaches" ON coaches
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update coaches" ON coaches
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete coaches" ON coaches
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can update groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can delete groups" ON groups;

CREATE POLICY "Anyone can insert groups" ON groups
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update groups" ON groups
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete groups" ON groups
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage attendance" ON attendance;

CREATE POLICY "Anyone can manage attendance" ON attendance
FOR ALL USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage student groups" ON student_groups;

CREATE POLICY "Anyone can manage student groups" ON student_groups
FOR ALL USING (true);