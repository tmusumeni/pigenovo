/*
  Migration: Enable Earnings Transfer Feature
  Adds support for transferring earnings to main wallet
*/

-- Update the check constraint to include 'transfer' type
ALTER TABLE wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'transfer'));

-- Add index for faster transfer lookups
CREATE INDEX IF NOT EXISTS wallet_transactions_type_idx ON wallet_transactions(type);

-- Add comment about transfer type
COMMENT ON CONSTRAINT wallet_transactions_type_check ON wallet_transactions 
IS 'Types: deposit (from external), withdrawal (to external), transfer (earnings to wallet)';
