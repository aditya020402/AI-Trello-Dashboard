-- Add profile fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available', -- available, focusing, relaxing, working
ADD COLUMN IF NOT EXISTS bio TEXT;
