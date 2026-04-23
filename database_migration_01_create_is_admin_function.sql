/*
  Fix: Create is_admin function and fix RLS policies for wallets
  Run this in your Supabase SQL Editor
  Step 1: Run this first to create the is_admin function
  Step 2: Then run the RLS policies migration
*/

-- Step 1: Create the is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_email text;
BEGIN
  -- Get user email from auth.users (if available via current session)
  user_email := auth.jwt() ->> 'email';

  -- Check if user is in profiles with admin role OR has the specific admin email
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  ) OR user_email = 'tmusumeni@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
