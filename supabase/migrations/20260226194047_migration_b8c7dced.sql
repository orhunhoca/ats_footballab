-- Ensure payment_plans policy is correct for authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert payment plans" ON payment_plans;
CREATE POLICY "Authenticated users can insert payment plans" 
ON payment_plans FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update payment plans" ON payment_plans;
CREATE POLICY "Authenticated users can update payment plans" 
ON payment_plans FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete payment plans" ON payment_plans;
CREATE POLICY "Authenticated users can delete payment plans" 
ON payment_plans FOR DELETE 
TO authenticated 
USING (true);