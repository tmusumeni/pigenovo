/*
  Migration: Add Phone Number & Country to Profiles
  Run this in your Supabase SQL Editor if you already have the database schema
*/

-- Add phone number and country columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number text unique,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS phone_flag text;

-- Add comment explaining the new fields
COMMENT ON COLUMN profiles.phone_number IS 'User phone number (unique identifier)';
COMMENT ON COLUMN profiles.country IS 'Country name (e.g., Rwanda, Uganda, Kenya)';
COMMENT ON COLUMN profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., RW, UG, KE)';
COMMENT ON COLUMN profiles.phone_flag IS 'Country flag emoji for visual display';
