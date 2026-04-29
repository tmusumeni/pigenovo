-- Migration 35: Fix RLS Policies for Profile TIN and Company Name Columns
-- Purpose: Allow authenticated users to update their own profile's TIN and company name

-- First, let's check and enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create a comprehensive policy that allows users to update their own profile including new columns
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure read policy exists
DROP POLICY IF EXISTS "Profiles are viewable by the user" ON profiles;

CREATE POLICY "Profiles are viewable by the user"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow insert for new profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check the policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
