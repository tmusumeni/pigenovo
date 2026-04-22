/*
  PiGenovo 2.0 - Foreign Key Relationships Fix
  Run this in your Supabase SQL Editor to enable proper joins
*/

-- Add explicit foreign key from wallet_transactions to profiles
ALTER TABLE wallet_transactions
ADD CONSTRAINT fk_wallet_transactions_user
FOREIGN KEY (user_id) 
REFERENCES profiles(id) ON DELETE CASCADE;

-- Add unique constraint on user_id in wallets to enable reverse relationship
ALTER TABLE wallets
ADD UNIQUE(user_id);

-- Verify all foreign keys are properly set
-- The following should already exist but let's ensure:
-- - proofs.task_id -> earn_tasks.id (already has this)
-- - trades.asset_id -> news_assets.id (already has this)
-- - trades.user_id -> profiles.id (need to add if missing)

-- Add explicit foreign key from trades to profiles
ALTER TABLE trades
ADD CONSTRAINT fk_trades_user
FOREIGN KEY (user_id) 
REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify the relationships exist by checking information_schema
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS referenced_table_name,
  ccu.column_name AS referenced_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
