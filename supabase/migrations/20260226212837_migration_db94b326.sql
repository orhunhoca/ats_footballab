-- Drop restrictive policies on performance_tests
DROP POLICY IF EXISTS "Users can view performance tests" ON performance_tests;
DROP POLICY IF EXISTS "Users can insert performance tests" ON performance_tests;
DROP POLICY IF EXISTS "Users can update performance tests" ON performance_tests;
DROP POLICY IF EXISTS "Users can delete performance tests" ON performance_tests;

-- Create more permissive policies (like other tables)
CREATE POLICY "Anyone can view performance tests" 
  ON performance_tests FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert performance tests" 
  ON performance_tests FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update performance tests" 
  ON performance_tests FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete performance tests" 
  ON performance_tests FOR DELETE 
  USING (true);