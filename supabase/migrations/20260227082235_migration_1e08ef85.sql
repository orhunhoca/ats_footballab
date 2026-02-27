-- Update coaches table for better auth integration
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'rejected'));

COMMENT ON COLUMN coaches.invited_at IS 'When the coach was invited to the system';
COMMENT ON COLUMN coaches.invite_status IS 'Status of the invitation: pending, accepted, rejected';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_invite_status ON coaches(invite_status);