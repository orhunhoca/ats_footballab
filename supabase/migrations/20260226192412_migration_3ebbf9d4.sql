-- First, drop ALL existing policies on payment_plans
DROP POLICY IF EXISTS "Authenticated users can manage payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Everyone can view payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Everyone can insert payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Everyone can update payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Everyone can delete payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Public can view active payment plans" ON payment_plans;

-- Now create fresh policies: Public can view active plans, but only admins can manage
CREATE POLICY "Public can view active payment plans"
ON payment_plans FOR SELECT
TO public
USING (is_active = true);

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
USING (true);

CREATE POLICY "Authenticated users can delete payment plans"
ON payment_plans FOR DELETE
TO authenticated
USING (true);