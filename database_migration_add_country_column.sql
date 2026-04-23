/*
  Migration: Add Country Column to Profiles Table
  Run this in your Supabase SQL Editor if the country column is missing
*/

-- Add country column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country text;

-- Add comment explaining the field
COMMENT ON COLUMN profiles.country IS 'Country name (e.g., Rwanda, Uganda, Kenya)';

-- Set a default value for existing records (optional)
-- UPDATE profiles SET country = 'Rwanda' WHERE country IS NULL AND phone_flag = '🇷🇼';
-- UPDATE profiles SET country = 'Unknown' WHERE country IS NULL;
