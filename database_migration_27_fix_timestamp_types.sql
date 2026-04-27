/*
  Migration 27: Fix Timestamp Types in get_received_proformas RPC Function
  
  The previous migration declared all timestamp columns as "timestamp with time zone"
  but the actual database columns are "timestamp without time zone".
  
  Error: structure of query does not match function result type
         Returned type timestamp without time zone does not match expected type timestamp with time zone in column 13
  
  Solution: Change ALL timestamp columns in RETURNS TABLE to match the actual database column types.
*/

-- Drop the incorrectly typed function
DROP FUNCTION IF EXISTS public.get_received_proformas(uuid);

-- Recreate with correct timestamp types (WITHOUT time zone, matching actual columns)
CREATE OR REPLACE FUNCTION public.get_received_proformas(p_receiver_user_id uuid)
RETURNS TABLE (
  id uuid,
  number text,
  client_name text,
  client_email text,
  client_phone text,
  description text,
  amount numeric,
  currency text,
  proforma_date timestamp without time zone,
  valid_until timestamp without time zone,
  status text,
  user_id uuid,
  sent_date timestamp without time zone,
  viewed_date timestamp without time zone,
  recipient_status text,
  created_at timestamp without time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.number,
    p.client_name,
    p.client_email,
    p.client_phone,
    p.description,
    p.amount,
    p.currency,
    p.proforma_date,
    p.valid_until,
    p.status,
    p.user_id,
    pr.sent_date,
    pr.viewed_date,
    pr.status as recipient_status,
    p.created_at
  FROM proformas p
  INNER JOIN proforma_recipients pr ON p.id = pr.proforma_id
  WHERE pr.receiver_user_id = p_receiver_user_id
  ORDER BY pr.sent_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.get_received_proformas(uuid) TO authenticated;

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
/*
After running this migration in your Supabase SQL Editor:

1. Test the RPC function directly with this query (replace with your receiver user ID):
   SELECT * FROM public.get_received_proformas('441f7fff-95c3-4781-ba7e-d1a71e2437c1');
   
   Expected result: Should return 2 rows (or however many proformas were sent to this receiver)
   WITHOUT any "timestamp does not match" errors

2. If it works, then in your app:
   - Open DevTools (F12)
   - Go to Application → Local Storage → Delete all
   - Go to Application → Session Storage → Delete all
   - Close the tab completely and reopen your app
   - Log in as the receiver (musumenit@gmail.com)
   - Go to "Received Proformas" tab
   - You should now see the proformas instead of "0 received"
*/

-- ============================================================================
-- EXPLANATION OF THE FIX
-- ============================================================================
/*
The issue was a type system mismatch:

WRONG (Migration 26):
  CREATE FUNCTION get_received_proformas(...) 
  RETURNS TABLE (
    proforma_date timestamp with time zone,    ← Database column is "without time zone"
    sent_date timestamp with time zone,        ← Database column is "without time zone"
    ...
  )

CORRECT (Migration 27):
  CREATE FUNCTION get_received_proformas(...) 
  RETURNS TABLE (
    proforma_date timestamp without time zone,  ← Matches actual database column
    sent_date timestamp without time zone,      ← Matches actual database column
    ...
  )

When Supabase tries to return query results:
- Actual columns return: timestamp without time zone
- Function expects: timestamp with time zone
- Supabase error: Type mismatch!

By declaring the function with the correct types, Supabase can now successfully
execute the query and return the results to your app.

This is a PostgreSQL best practice: always declare function return types
to exactly match the underlying table columns.
*/
