/*
  NOTIFICATION SYSTEM - MANUAL TEST QUERIES
  
  Use these queries in Supabase SQL Editor to test the notification system
  without having to use the frontend.
*/

-- ============================================================================
-- TEST 1: Verify RPC Functions Exist
-- ============================================================================
-- Run this to make sure the functions are installed
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_name IN (
    'send_receiver_notification_email',
    'send_status_notification_email',
    'send_proforma_to_receiver',
    'receiver_accept_proforma',
    'receiver_reject_proforma'
  );

-- Expected: Should show 5 rows (all functions exist)


-- ============================================================================
-- TEST 2: Verify proforma_notifications Table Exists
-- ============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proforma_notifications';

-- Expected: Should show columns like id, proforma_id, receiver_user_id, etc.


-- ============================================================================
-- TEST 3: Check All User Accounts
-- ============================================================================
-- First, list all users so you can see their IDs
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  u.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY created_at DESC
LIMIT 20;

-- Note down the user IDs you want to test with


-- ============================================================================
-- TEST 4: Check All Proformas
-- ============================================================================
-- See all proformas and their status
SELECT 
  id,
  number,
  client_name,
  status,
  user_id,
  client_user_id,
  created_at
FROM proformas
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================================
-- TEST 5: Manually Log a Notification (Simulates System)
-- ============================================================================
-- This simulates what happens when receiver gets a new proforma
-- Replace the UUIDs with real ones from TEST 2 and TEST 4

INSERT INTO proforma_notifications (
  proforma_id,
  receiver_user_id,
  sender_user_id,
  notification_type,
  receiver_email,
  email_status
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with real proforma_id
  '11111111-1111-1111-1111-111111111111', -- Replace with real receiver_user_id
  '22222222-2222-2222-2222-222222222222', -- Replace with real sender_user_id
  'sent',
  'receiver@example.com', -- Receiver's email
  'pending'
);

-- Check if row was created
SELECT * FROM proforma_notifications 
ORDER BY created_at DESC 
LIMIT 1;


-- ============================================================================
-- TEST 6: Test Acceptance Notification
-- ============================================================================
-- This simulates what happens when receiver accepts
INSERT INTO proforma_notifications (
  proforma_id,
  receiver_user_id,
  sender_user_id,
  notification_type,
  receiver_email,
  email_status
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Same proforma
  '11111111-1111-1111-1111-111111111111', -- Same receiver
  '22222222-2222-2222-2222-222222222222', -- Same sender
  'accepted', -- Changed to 'accepted'
  'sender@example.com', -- Now sender's email
  'pending'
);


-- ============================================================================
-- TEST 7: Check Notification Log
-- ============================================================================
SELECT 
  n.id,
  n.proforma_id,
  p.number as proforma_number,
  n.notification_type,
  n.receiver_email,
  n.email_status,
  n.sent_at
FROM proforma_notifications n
LEFT JOIN proformas p ON n.proforma_id = p.id
ORDER BY n.sent_at DESC
LIMIT 20;

-- This shows all notification attempts


-- ============================================================================
-- TEST 8: Check if Edge Function Logs Show Up
-- ============================================================================
-- Run this in terminal: supabase functions logs send-proforma-email
-- 
-- Look for:
-- ✅ "Processing sent notification for receiver@example.com"
-- ✅ "Email sent to receiver@example.com"
--
-- If you see errors, they'll show here


-- ============================================================================
-- TEST 9: Get Email Delivery Status
-- ============================================================================
SELECT 
  id,
  receiver_email,
  notification_type,
  email_status,
  error_message,
  sent_at
FROM proforma_notifications
WHERE email_status IN ('pending', 'sent', 'failed')
ORDER BY sent_at DESC
LIMIT 10;

-- After email tries to send:
-- ✅ email_status should change to 'sent' (if successful)
-- ❌ email_status should change to 'failed' with error details (if failed)


-- ============================================================================
-- TEST 10: Test RPC Functions Directly
-- ============================================================================
-- Test send_receiver_notification_email function
SELECT send_receiver_notification_email(
  p_receiver_user_id := '11111111-1111-1111-1111-111111111111'::uuid,
  p_proforma_id := '00000000-0000-0000-0000-000000000001'::uuid,
  p_proforma_number := 'PRO-001',
  p_sender_name := 'John Doe'
);

-- Test send_status_notification_email function
SELECT send_status_notification_email(
  p_proforma_id := '00000000-0000-0000-0000-000000000001'::uuid,
  p_notification_type := 'accepted',
  p_notifier_user_id := '11111111-1111-1111-1111-111111111111'::uuid
);


-- ============================================================================
-- CLEANUP: Delete Test Notifications
-- ============================================================================
-- Only run if you want to clean up test data
DELETE FROM proforma_notifications 
WHERE email_status = 'pending' 
  AND sent_at > NOW() - INTERVAL '1 hour';

-- Check what was deleted
SELECT COUNT(*) as deleted_rows;


-- ============================================================================
-- FULL TEST WORKFLOW (Copy & Paste All at Once)
-- ============================================================================

-- Step 1: Check your user IDs
SELECT id, email FROM profiles LIMIT 5;

-- Step 2: Check your proforma IDs
SELECT id, number, status FROM proformas LIMIT 5;

-- Step 3: Create a test notification
INSERT INTO proforma_notifications (proforma_id, receiver_user_id, sender_user_id, notification_type, receiver_email, email_status)
VALUES (
  (SELECT id FROM proformas LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM profiles OFFSET 1 LIMIT 1),
  'sent',
  (SELECT email FROM profiles LIMIT 1),
  'pending'
);

-- Step 4: Check if notification was created
SELECT * FROM proforma_notifications ORDER BY created_at DESC LIMIT 1;

-- Step 5: Monitor email status (wait 10 seconds, then run again)
SELECT email_status, error_message FROM proforma_notifications ORDER BY created_at DESC LIMIT 1;

