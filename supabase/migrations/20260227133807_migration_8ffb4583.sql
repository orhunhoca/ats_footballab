ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS invite_token UUID,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_coaches_invite_token ON coaches(invite_token);