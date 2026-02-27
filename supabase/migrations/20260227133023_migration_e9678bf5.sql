-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policy that allows authenticated users to create profiles for new users
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also update the UPDATE policy to allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update profiles" ON profiles
  FOR UPDATE
  TO public
  USING (auth.uid() IS NOT NULL);