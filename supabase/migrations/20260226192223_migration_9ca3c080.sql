-- Make payment_plans accessible to everyone for testing purposes
DROP POLICY IF EXISTS "Authenticated users can view all payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Authenticated users can insert payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Authenticated users can update payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Authenticated users can delete payment plans" ON payment_plans;

-- Create policies for PUBLIC (everyone)
CREATE POLICY "Everyone can view payment plans" ON payment_plans FOR SELECT TO public USING (true);
CREATE POLICY "Everyone can insert payment plans" ON payment_plans FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Everyone can update payment plans" ON payment_plans FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Everyone can delete payment plans" ON payment_plans FOR DELETE TO public USING (true);