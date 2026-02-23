-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete users" ON users FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert initial admin user (password: orko4477, hashed with bcrypt)
INSERT INTO users (full_name, username, password, role, is_active)
VALUES (
  'Admin',
  'admin',
  '$2a$10$YourHashedPasswordHere',
  'admin',
  true
);