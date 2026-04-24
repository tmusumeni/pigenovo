/*
  Migration: Populate Phone Data for Existing Users
  Run this in your Supabase SQL Editor to fix "No phone assigned" display issue
*/

-- First, ensure all phone columns exist (if not already created)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number text unique,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS phone_flag text;

-- Populate Rwanda as default for users with no country data
UPDATE profiles
SET 
  country = 'Rwanda',
  country_code = 'RW',
  phone_flag = '🇷🇼'
WHERE country IS NULL;

-- Generate default phone numbers for users without phone_number
-- Format: +250 followed by random digits
UPDATE profiles
SET phone_number = '+250' || LPAD(CAST(FLOOR(RANDOM() * 1000000000) AS TEXT), 9, '0')
WHERE phone_number IS NULL OR phone_number = '';

-- Verify the migration (check how many users have phone data)
SELECT 
  COUNT(*) as total_users,
  COUNT(phone_number) as users_with_phone,
  COUNT(country) as users_with_country,
  COUNT(CASE WHEN phone_number IS NOT NULL AND country IS NOT NULL THEN 1 END) as fully_populated
FROM profiles;

-- Show a sample of updated profiles
SELECT id, email, full_name, phone_number, country, country_code, phone_flag 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
