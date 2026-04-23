/*
  Fix: Add Missing RLS Policies for Wallets & Wallet Transactions
  Run this in your Supabase SQL Editor to fix the deposit approval issue
  
  IMPORTANT: First run database_migration_01_create_is_admin_function.sql
  Then run this file
*/

-- Step 2: Drop existing policies (careful with this!)
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON wallets;

-- Create comprehensive wallet policies
CREATE POLICY "Users can view their own wallet" 
ON wallets 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert their own wallet"
ON wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can update their own wallet"
ON wallets
FOR UPDATE
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete wallets"
ON wallets
FOR DELETE
USING (is_admin(auth.uid()));

-- Fix wallet_transactions RLS policies
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON wallet_transactions;

CREATE POLICY "Users can view their own transactions"
ON wallet_transactions
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create their own transactions"
ON wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can update transactions"
ON wallet_transactions
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete transactions"
ON wallet_transactions
FOR DELETE
USING (is_admin(auth.uid()));
