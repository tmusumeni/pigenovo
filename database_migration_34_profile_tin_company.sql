-- Migration 34: Add TIN Number and Company Name columns to profiles table
-- Purpose: Store Tax Identification Number and Company Name for better data retrieval and professional documents

-- Add columns to profiles table if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_tin_number ON profiles(tin_number);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name);

-- Update RLS policies if needed (profiles are already accessible to the user)
-- Grant permissions
GRANT UPDATE ON profiles TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN profiles.tin_number IS 'Tax Identification Number - used in professional documents like proformas and invoices';
COMMENT ON COLUMN profiles.company_name IS 'Company name - displayed in proformas, invoices, and sender information';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('tin_number', 'company_name');
