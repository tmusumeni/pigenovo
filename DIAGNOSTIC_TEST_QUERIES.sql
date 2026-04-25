/*
 DIAGNOSTIC TEST - Check if proforma was actually sent to receiver
 
 Run these queries in Supabase SQL Editor to diagnose the issue
*/

-- ============================================================================
-- STEP 1: Find the proforma that was supposedly sent
-- ============================================================================
SELECT 
  id,
  number,
  client_name,
  client_email,
  status,
  user_id,                    -- Sender ID
  client_user_id,             -- Receiver ID (should be SET if sent)
  sent_date
FROM proformas
WHERE status = 'sent' OR status = 'draft'
ORDER BY created_at DESC
LIMIT 10;

-- EXPECTED: Should see the proforma with:
-- - status: 'sent' (not 'draft')
-- - client_user_id: NOT NULL (should have receiver's UUID)
-- - sent_date: Should have timestamp

-- IF status = 'draft' OR client_user_id = NULL
-- → Problem: RPC function didn't update properly


-- ============================================================================
-- STEP 2: Check if receiver email exists in profiles
-- ============================================================================
SELECT id, email, full_name FROM profiles
WHERE email = 'receiver@email.com';  -- Replace with actual receiver email

-- EXPECTED: Should find 1 row with receiver's UUID
-- IF no rows: Receiver not registered
-- IF multiple rows: Email duplicated (shouldn't happen)


-- ============================================================================
-- STEP 3: Check if receiver should see the proforma
-- ============================================================================
-- Get the receiver's UUID from step 2, then run:
SELECT 
  id,
  number,
  client_name,
  status,
  user_id,
  client_user_id,
  sent_date
FROM proformas
WHERE client_user_id = '00000000-0000-0000-0000-000000000000'  -- Replace with receiver UUID
ORDER BY created_at DESC;

-- EXPECTED: Should see the proforma here
-- IF no results: Proforma wasn't linked to receiver (RPC failed)


-- ============================================================================
-- STEP 4: Check for any errors in RPC execution
-- ============================================================================
-- Look at recent function calls (these show in logs sometimes)
SELECT 
  id, 
  created_at, 
  error_details 
FROM pgsql_error_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================================
-- STEP 5: Test if the RPC function actually works
-- ============================================================================
-- Find a draft proforma:
SELECT id FROM proformas WHERE status = 'draft' LIMIT 1;

-- Then run the RPC (replace UUIDs):
SELECT send_proforma_to_receiver(
  p_proforma_id := '12345678-1234-1234-1234-123456789012',  -- Proforma UUID  
  p_sender_user_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Sender UUID
  p_receiver_email := 'receiver@email.com'  -- Receiver email
);

-- EXPECTED: Should return the proforma ID
-- IF error: Shows the exact error message


-- ============================================================================
-- STEP 6: Common issues - Check migration status
-- ============================================================================
-- Verify the columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'proformas'
AND column_name IN ('client_user_id', 'sent_date', 'viewed_by_client')
ORDER BY column_name;

-- EXPECTED: Should see 3 rows (all columns exist)
-- IF no rows: Migration 20 didn't run


-- ============================================================================
-- QUICK DIAGNOSIS SCRIPT (Run All At Once)
-- ============================================================================

-- Check 1: Proforma status
SELECT 'Check 1: Latest Proforma' as test, COUNT(*) as count FROM proformas WHERE status IN ('sent', 'draft');

-- Check 2: Receiver exists
SELECT 'Check 2: Receiver account' as test, COUNT(*) as count FROM profiles WHERE email = 'receiver@email.com';

-- Check 3: Client user ID is set
SELECT 'Check 3: Proforma linked' as test, COUNT(*) as count FROM proformas WHERE client_user_id IS NOT NULL;

-- Check 4: Columns exist
SELECT 'Check 4: Columns exist' as test, COUNT(*) as count FROM information_schema.columns
WHERE table_name = 'proformas' AND column_name IN ('client_user_id', 'sent_date', 'viewed_by_client');

-- ============================================================================
-- MOST LIKELY PROBLEMS & FIXES
-- ============================================================================

/*
PROBLEM #1: Proforma status still 'draft' (wasn't updated to 'sent')
→ SOLUTION: Migrations not run. Run migration 20 and 21 in SQL Editor

PROBLEM #2: Column 'client_user_id' doesn't exist
→ SOLUTION: Run migration 20: database_migration_20_proforma_receiver.sql

PROBLEM #3: No rows returned in Step 3  
→ SOLUTION: Receiver email doesn't match exactly. Case-sensitive!

PROBLEM #4: RPC function not found error
→ SOLUTION: Run migration 21: database_migration_21_proforma_receiver_functions.sql

PROBLEM #5: Error "User with email... not found"
→ SOLUTION: Receiver must be registered first. Create account + log in

PROBLEM #6: Everything checks out but still not showing
→ SOLUTION: Receiver needs to manually refresh app (F5) or wait 10 seconds
*/
