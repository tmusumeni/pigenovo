# URGENT: Fix Receiver Proformas Not Loading (0 Received)

## Problem
Receivers are seeing "0 received proformas" even though senders successfully sent them.

**Root Cause:** Missing RLS (Row Level Security) policies on the `proforma_recipients` table. 

**Note:** Circular RLS policies (checking proformas from proforma_items, etc.) cause infinite recursion errors. Solution is to use SECURITY DEFINER RPC functions instead.

## Quick Fix (2 Steps)

### Step 1: Copy the SQL Fix
The complete fix is in: **`database_migration_24_fix_receiver_rls.sql`**

This file contains ONLY the necessary changes:
- Enable RLS on `proforma_recipients` table
- Simple policies: receivers see their received, senders see who they sent to
- NO circular references (those cause infinite recursion)
- RPC functions with SECURITY DEFINER handle the rest

### Step 2: Run in Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Paste the entire SQL from **`database_migration_24_fix_receiver_rls.sql`**
5. Click **Run** button
6. Wait for completion (should show no errors)
7. Refresh your app

## What This Fix Does

✅ Enables RLS on `proforma_recipients` table  
✅ Receivers can query their received proformas  
✅ Senders can track who they sent to  
✅ RPC functions handle data access securely  
✅ No circular references = no infinite recursion  

## Why This Approach?

**Previous Problem:**
```sql
-- This creates infinite recursion! ❌
CREATE POLICY "Receivers can see proformas" ON proformas
  USING (EXISTS (SELECT 1 FROM proforma_recipients ...))
```

**Correct Solution:**
```sql
-- Simple direct check on receiver_user_id ✅
CREATE POLICY "Users can view their received" ON proforma_recipients
  USING (auth.uid() = receiver_user_id);

-- Keep existing proformas RLS (senders only see their own)
-- RPC functions with SECURITY DEFINER handle the rest
```

## Database Architecture

**Flow:**

```
Sender sends proforma to receiver@email.com
  ↓
send_proforma_to_receiver_v2() RPC (SECURITY DEFINER):
  - Creates row in proforma_recipients
  - Links sender's proforma to receiver's user_id
  - Sets status to 'pending'
  ↓
Receiver logs in with receiver@email.com
  ↓
fetchReceivedProformas() calls get_received_proformas() RPC (SECURITY DEFINER):
  - Bypasses RLS entirely
  - JOINs proformas + proforma_recipients
  - Returns rows where receiver_user_id = auth.uid()
  ↓
Receiver sees their proformas in "Received Proformas" tab
  ↓
Receiver can Accept/Reject/View
```

**RLS Policies ONLY on proforma_recipients:**

| Operation | Who | Condition | Result |
|-----------|-----|-----------|--------|
| SELECT proforma_recipients | Receiver | `auth.uid() = receiver_user_id` | Can see their records |
| SELECT proforma_recipients | Sender | Exists in proformas.user_id | Can see who they sent to |
| INSERT/UPDATE | RPC Functions | SECURITY DEFINER | Always allowed |

## After Running the Fix

- ✅ Receivers see all proformas sent to them
- ✅ "Received Proformas" tab shows data
- ✅ Accept/Reject buttons work
- ✅ View/Edit functionality works
- ✅ No infinite recursion errors

## Troubleshooting

**If still showing 0:**
1. Check browser console (F12) for JavaScript errors
2. Verify you are logged in as the receiver account
3. Verify sender sent to the exact email address of receiver
4. Check that `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` completed
5. Verify all 4 policies were created (check Supabase RLS settings)

**To test manually in Supabase SQL Editor:**
```sql
-- Get the receiver's user ID from auth.users email
SELECT id FROM auth.users WHERE email = 'receiver@email.com';

-- Then run this with the ID from above
SELECT * FROM public.get_received_proformas('receiver-user-id-uuid-here');
```

Should return rows if proformas exist where this user_id is a receiver.

## Files Updated

- ✅ `database_migration_24_fix_receiver_rls.sql` - NEW (no circular policies)
- ✅ `database_migration_23_proforma_recipients.sql` - Updated (simple policies only)
- ✅ `database_migration_13_proforma_workflow.sql` - Updated (removed circular policies)

## Key Differences from Previous Attempt

| Approach | Result | Why |
|----------|--------|-----|
| Add RLS to proformas/items checking proforma_recipients | ❌ Infinite recursion | Circular reference |
| Add RLS only to proforma_recipients | ✅ Works perfectly | Direct, no circles |

---

**Ready to go!** Run the SQL from `database_migration_24_fix_receiver_rls.sql` in Supabase.

