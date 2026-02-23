-- Add missing columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS schedule TEXT; -- Simple JSON string for schedule

-- Add missing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT CURRENT_DATE;

-- Add check constraints for status
ALTER TABLE groups ADD CONSTRAINT groups_status_check CHECK (status IN ('Aktif', 'Pasif'));