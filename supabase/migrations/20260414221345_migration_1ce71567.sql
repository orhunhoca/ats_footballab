-- Step 1: First, update all existing NULL or invalid roles to 'user'
UPDATE profiles SET role = 'user' WHERE role IS NULL OR role NOT IN ('admin', 'user');

-- Step 2: Add role column if not exists (should already exist from previous attempt)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Step 3: Now add the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- Step 4: Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 5: Update orhunhoca@hotmail.com to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'orhunhoca@hotmail.com';

-- Verify the update
SELECT email, role FROM profiles WHERE email = 'orhunhoca@hotmail.com';