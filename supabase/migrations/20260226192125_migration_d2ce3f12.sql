-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to insert payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Allow authenticated users to update payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Allow authenticated users to delete payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Allow everyone to view active payment plans" ON payment_plans;

-- Create new policies that allow authenticated users full access
CREATE POLICY "Authenticated users can view all payment plans"
ON payment_plans FOR SELECT
TO authenticated
USING (true);

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