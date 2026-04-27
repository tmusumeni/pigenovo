# URGENT: Fix Receiver Proformas Not Loading (0 Received)

## Problem
Receivers are seeing "0 received proformas" even though senders successfully sent them.

**Root Cause:** Missing RLS (Row Level Security) policies on the `proforma_recipients` table and missing receiver permissions on the `proformas` and `proforma_items` tables.

## Quick Fix (2 Steps)

### Step 1: Copy the SQL Fix
The complete fix is in: `database_migration_24_fix_receiver_rls.sql`

### Step 2: Run in Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Paste the entire SQL from `database_migration_24_fix_receiver_rls.sql`
5. Click **Run** button
6. Wait for completion (should show no errors)

## What This Fix Does

✅ Enables RLS on `proforma_recipients` table  
✅ Adds policy: Receivers can see proformas sent to them  
✅ Adds policy: Receivers can see line items in those proformas  
✅ Adds policy: Senders can track who they sent to  
✅ Ensures RPC functions can still insert/update recipients  

## After Fix

- Receivers will immediately see all proformas sent to them
- The "Received Proformas" tab will show data
- Accept/Reject buttons will work
- Edit functionality will work

## How It Works

**Flow:**

```
Sender sends proforma to receiver@email.com
  ↓
send_proforma_to_receiver_v2() RPC function:
  - Creates row in proforma_recipients table
  - Links sender's proforma to receiver's user_id
  - Sets status to 'pending'
  ↓
Receiver logs in with receiver@email.com
  ↓
fetchReceivedProformas() calls get_received_proformas() RPC
  - Uses RLS: pr.receiver_user_id = auth.uid()
  - Returns all proformas where receiver is listed
  ↓
Receiver sees their proformas in "Received Proformas" tab
  ↓
Receiver can Accept/Reject/View
```

## Database Schema

**proforma_recipients table:**
```
id          - UUID (primary key)
proforma_id - UUID (refers to sender's proforma)
receiver_user_id - UUID (receiver's auth user ID)
sent_date   - timestamp of when sent
viewed_date - timestamp of when receiver first viewed
status      - 'pending' | 'accepted' | 'rejected' | 'converted'
created_at  - timestamp
updated_at  - timestamp
```

**RLS Policies After Fix:**

| Table | Policy | Who | Can Do |
|-------|--------|-----|--------|
| proforma_recipients | Users can view their received | Receivers | SELECT their received proformas |
| proforma_recipients | Senders can view their sent | Senders | SELECT who they sent to |
| proformas | Receivers can see proformas sent to them | Receivers | SELECT proformas by proform_recipients lookup |
| proforma_items | Receivers can see items | Receivers | SELECT line items for received proformas |

## Troubleshooting

**If still showing 0:**
1. Check browser console (F12) for JavaScript errors
2. Verify you are logged in as the receiver account
3. Verify sender sent to the exact email address of receiver account
4. Check that RPC function execution completed without errors

**To test manually in Supabase:**
```sql
-- Test as receiver user (replace UUID with receiver's user_id)
SELECT * FROM public.get_received_proformas('receiver-user-id-here');
```

Should return rows if:
- Proformas exist in proforma_recipients with this receiver_user_id
- RLS policies are correctly applied

## Files Modified

- ✅ `database_migration_24_fix_receiver_rls.sql` - NEW FIX FILE
- ✅ `database_migration_23_proforma_recipients.sql` - Updated with RLS policies
- ✅ `database_migration_13_proforma_workflow.sql` - Updated with receiver RLS policies

## Next Steps

1. Run the SQL migration in Supabase (see Step 2 above)
2. Refresh the app in browser
3. Receiver should now see their proformas
4. Test Accept/Reject buttons

---

**Questions?** Check that all three files are updated and the SQL ran without errors.
