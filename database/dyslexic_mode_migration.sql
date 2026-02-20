-- Add is_dyslexic column to users table for accessibility support
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_dyslexic BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on dyslexic users
CREATE INDEX IF NOT EXISTS idx_users_dyslexic ON users(is_dyslexic) WHERE is_dyslexic = TRUE;

-- Update existing users to have default value
UPDATE users SET is_dyslexic = FALSE WHERE is_dyslexic IS NULL;
