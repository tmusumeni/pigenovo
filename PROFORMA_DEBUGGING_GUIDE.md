/*
  PROFORMA RECEIVER SYSTEM - DEBUGGING & VERIFICATION GUIDE
  Use this to verify everything is working correctly
*/

================================================================================
ISSUE: Receiver doesn't see received proformas
================================================================================

CHECKLIST:

1. ✅ DATABASE MIGRATIONS RUN?
   - Log into Supabase → SQL Editor
   - Copy and run: database_migration_20_proforma_receiver.sql
   - Copy and run: database_migration_21_proforma_receiver_functions.sql
   - Should complete without errors

2. ✅ RECEIVER EMAIL REGISTERED?
   - SENDER account: Create proforma
   - Enter RECEIVER's email in "client_email"
   - IMPORTANT: Email must match exactly with receiver's registered account email
   - Receiver must be registered in the system (has login account)

3. ✅ NO ERROR WHEN SENDING?
   - Click "Send" on proforma
   - Should see: "✅ Proforma sent to xxx@email.com"
   - Should see: "📬 xxx@email.com will see it in their 'Received Proformas' tab"
   - If error: "User with email xxx not found" → Receiver needs to register first

4. ✅ RECEIVER REFRESHES PAGE?
   - CRITICAL: Receiver's page auto-refreshes every 5 seconds
   - Or manually refresh (F5 or Cmd+R)
   - Go to "Received Proformas" tab
   - Click on the tab actively (don't stay on "My Proformas")
   - Should see the proforma with blue border

5. ✅ CHECK BROWSER CONSOLE FOR ERRORS
   - Open browser: F12 → Console tab
   - Send proforma and watch for errors
   - Report any red error messages

================================================================================
BROWSER CONSOLE VERIFICATION SCRIPT (For Troubleshooting)
================================================================================

Paste this in browser console (F12 → Console) to debug:

// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.email);

// Check if their email is in profiles table
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  console.log('Profile:', profile);
}

// Try to find another user by email
const receiverEmail = 'receiver@example.com'; // Change this to test
const { data: receiver } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', receiverEmail)
  .single();
console.log('Receiver found:', receiver);

// Check received proformas for current user
const { data: receivedProfs } = await supabase
  .from('proformas')
  .select('*')
  .eq('client_user_id', user?.id);
console.log('Received proformas:', receivedProfs);

================================================================================
COMMON ISSUES & FIXES
================================================================================

ISSUE 1: "User with email xxx not found"
CAUSE: Receiver email doesn't match exactly or receiver not registered
FIX: 
  - Ask receiver to sign up first
  - Verify email spelling matches exactly
  - Receiver must be in auth.users AND profiles table

ISSUE 2: Receiver has account but sees nothing
CAUSE: Page not refreshing or auto-refresh hasn't run
FIX:
  - Receiver clicks "Received Proformas" tab actively
  - Manual refresh: F5 or Cmd+R
  - Wait 5 seconds for auto-refresh
  - Log out and log back in

ISSUE 3: Success message but nothing in database
CAUSE: RPC function might not have run or migration incomplete
FIX:
  - Verify migrations ran without errors
  - Check Supabase → SQL Editor → Recent queries for errors
  - Try running migrations again

ISSUE 4: "Proforma not found or already sent"
CAUSE: You're trying to send a proforma that's already sent
FIX:
  - Only DRAFT proformas can be sent
  - Create a new proforma

================================================================================
DATA FLOW DIAGRAM
================================================================================

SENDER PATH:
1. Sender creates proforma (status = 'draft')
2. Sender enters receiver's email in "client_email"
3. Sender clicks "Send"
4. System calls: send_proforma_to_receiver(proforma_id, sender_id, receiver_email)
5. RPC finds receiver by email → gets their user_id
6. Updates proforma: status = 'sent', client_user_id = receiver_id
7. Sender sees: "✅ Sent to receiver@email.com"

RECEIVER PATH:
1. Receiver logs into their account
2. Goes to Proformas → "Received Proformas" tab
3. System fetches: proformas WHERE client_user_id = receiver_id
4. Receiver sees all proformas sent to them
5. Receiver can: Preview, Accept, Reject, Convert to Invoice
6. Clicking "Accept" updates status to 'accepted'

================================================================================
TESTING SCENARIO
================================================================================

TEST 1: Basic Send & Receive
1. Create Account A and B (both registered)
2. Account A: Create proforma
3. Account A: Enter Account B's email in "client_email"
4. Account A: Click "Send" → See success message
5. Account A: Can see proforma in "My Proformas" with status "sent"
6. Account B: Refresh page
7. Account B: Click "Received Proformas" tab
8. Account B: Should see proforma from Account A with blue border

TEST 2: Accept Flow
1. Account B: Sees received proforma
2. Account B: Clicks "Accept" button
3. Account B: Status changes to "accepted"
4. Account B: "Convert to Invoice" button appears
5. Account A: Refreshes page, sees status updated to "accepted"

TEST 3: Reject Flow
1. Same as Test 1 up to step 8
2. Account B: Clicks "Reject" button
3. Account B: Status changes to "rejected"
4. Account B: No more action buttons
5. Account A: See status updated to "rejected"

================================================================================
IF STILL NOT WORKING
================================================================================

1. Check Supabase → Authentication → Users
   - Both sender and receiver accounts exist? ✓

2. Check Supabase → SQL Editor → Run diagnostics:

   -- List all users
   SELECT id, email FROM profiles LIMIT 10;

   -- Find specific user by email
   SELECT id, email FROM profiles WHERE email = 'receiver@example.com';

   -- Check proformas for specific sender
   SELECT number, status, client_user_id, created_at FROM proformas 
   WHERE user_id = 'SENDER_ID_HERE'
   ORDER BY created_at DESC;

   -- Check proformas for specific receiver
   SELECT number, status, user_id, sent_date FROM proformas 
   WHERE client_user_id = 'RECEIVER_ID_HERE'
   ORDER BY created_at DESC;

3. If migrations are missing or have errors:
   - Go to Supabase → SQL Editor
   - Click "Recent" tab
   - Look for any failed queries
   - Re-run migrations that failed

4. Enable Real-time subscriptions (Advanced):
   - Component already has auto-refresh every 5 seconds
   - Additional subscription can be added for instant updates

================================================================================
