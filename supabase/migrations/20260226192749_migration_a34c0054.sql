-- Remove role-based policy and use simple authentication check
DROP POLICY IF EXISTS "Authenticated users can insert payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Authenticated users can update payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Authenticated users can delete payment plans" ON payment_plans;

-- Create simpler policies - just check if user is authenticated
CREATE POLICY "Authenticated users can insert payment plans"
ON payment_plans FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment plans"
ON payment_plans FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payment plans"
ON payment_plans FOR DELETE
TO authenticated
USING (true);