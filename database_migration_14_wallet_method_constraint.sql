/*
  Migration: Fix wallet_transactions method constraint
  Adds properly supported methods for wallet transactions
  
  Run this in your Supabase SQL Editor to fix export fee recording
*/

-- First, drop existing method constraint if it exists
ALTER TABLE wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_method_check;

-- Clean up any rows with NULL or invalid method values
-- Set them to 'service_charge' as a safe default
UPDATE wallet_transactions
SET method = 'service_charge'
WHERE method IS NULL 
   OR method NOT IN (
     'bank_transfer',
     'wallet_payment',
     'invoice_payment',
     'export_fee',
     'service_charge',
     'withdrawal',
     'deposit',
     'transfer',
     'earnings_transfer'
   );

-- Add comprehensive method constraint with all supported methods
ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_method_check 
CHECK (method IN (
  'bank_transfer',          -- Bank deposit/withdrawal
  'wallet_payment',         -- Payment from one wallet to another
  'invoice_payment',        -- Payment for invoice converted from proforma
  'export_fee',             -- Fee for exporting proforma/invoice
  'service_charge',         -- General service charges
  'withdrawal',             -- General withdrawal
  'deposit',                -- General deposit
  'transfer',               -- Internal transfer
  'earnings_transfer'       -- Transfer from earnings wallet to main wallet
));

-- Add comment explaining all methods
COMMENT ON CONSTRAINT wallet_transactions_method_check ON wallet_transactions 
IS 'Payment methods: bank_transfer, wallet_payment, invoice_payment, export_fee, service_charge, withdrawal, deposit, transfer, earnings_transfer';

-- Create index on method for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_method ON wallet_transactions(method);
